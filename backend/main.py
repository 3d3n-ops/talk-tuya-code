# This part of the code is to initialize fastAPI and include the routes to otehr parts of the backend. 

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from git import Repo
from pinecone import Pinecone
from transformers import AutoTokenizer, AutoModel
import torch
from transformers import pipeline
import openai
from fastapi.routing import APIRoute
from typing import List
from dotenv import load_dotenv

load_dotenv()

# Move app initialization to the top
app = FastAPI()

# Allow CORS from all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all domains to access this backend
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Your existing endpoints go here...

for route in app.routes:
    if isinstance(route, APIRoute):
        print(f"Route: {route.path}, Methods: {route.methods}")

class RepoRequest(BaseModel):
    github_url: str


class QueryRequest(BaseModel):
    query: str
    namespace: str  # Optional namespace parameter


def setup_index():
    try:
        # Retrieve API key and host
        pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"), environment=os.environ.get("PINECONE_ENVIRONMENT"))
        
        if not pc:
            raise ValueError("PINECONE_API_KEY not found in environment variables")

        # Initialize Pinecone
        
        index_name = "talk-tuya-code"
        # Connect to index
        index = pc.Index(index_name)
        print(f"Successfully connected to Pinecone index: {index_name}")
        return index

    except Exception as e:
        print(f"Error in setup_index: {str(e)}")
        raise  # Re-raise the exception to see the full error trace


def generate_embeddings(content):
    tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-mpnet-base-v2")
    model = AutoModel.from_pretrained("sentence-transformers/all-mpnet-base-v2")

    inputs = tokenizer(content, return_tensors="pt", truncation=True, max_length=512, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    embeddings = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()
    return embeddings

# Function to set up Pinecone index
def embed_codebase(clone_dir):
    # Process and embed the codebase
    index = setup_index()
    if not index:
        raise ValueError("Failed to initialize Pinecone index")
        
    print(f"Starting to process files in {clone_dir}")
    
    for root, _, files in os.walk(clone_dir):
        for file in files:
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r", errors="ignore") as f:
                    content = f.read()
                    if not content.strip() or len(content) > 50000:
                        print(f"Skipping file: {file_path}")
                        continue
                    if not file.endswith(('.py', '.js', '.tsx', '.jsx', '.ipynb', '.java', '.cpp', '.ts', '.go', '.rs', '.vue', '.swift', '.c', '.h')):
                        continue
                    # Example: Create embeddings (replace with your embedding logic)
                    embeddings = generate_embeddings(content)# Replace with real embeddings
                    print(f"Processing file: {file_path}")
                    
                    # Add ID prefix to ensure unique IDs
                    vector_id = f"doc_{file_path}"
                    
                    # Ensure embeddings is a list and has the correct dimension
                    if not isinstance(embeddings, list):
                        embeddings = embeddings.tolist()
                    
                    print(f"Upserting embeddings for {file_path}")
                    index.upsert(vectors=[(vector_id, embeddings)])
                    print(f"Successfully embedded: {file_path}")
            except Exception as e:
                print(f"Error processing file {file_path}: {e}")
                continue
  
def embed_query(query):
    return generate_embeddings(query)

# Route to process and embed the repository
@app.post("/process-repo/")
async def process_repo(request: RepoRequest):
    try:
        repo_url = request.github_url
        clone_dir = os.path.join(os.getcwd(), "cloned_repo")

        # Clone the repository
        if os.path.exists(clone_dir):
            print("Repository already cloned. Using existing directory.")
        else:
            print(f"Cloning repository: {repo_url}")
            Repo.clone_from(repo_url, clone_dir)

        # Embed the codebase
        index = setup_index()
        embed_codebase(clone_dir)
        return {"status": "success", "message": "Repository processed and embedded successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Add new query endpoint
@app.post("/query-codebase/")
async def query_codebase(request: QueryRequest):
    try:
        # Get the index
        index = setup_index()
        if not index:
            return {"status": "error", "message": "Failed to connect to Pinecone"}

        # Generate embeddings for the query
        query_embedding = embed_query(request.query)

        # Search Pinecone for relevant code snippets
        search_results = index.query(
            vector=query_embedding,
            top_k=5,
            include_metadata=True,
            namespace=request.namespace if hasattr(request, 'namespace') else "default-namespace"
        )

        # Prepare context from search results
        contexts = []
        for match in search_results['matches']:
            with open(match['id'], 'r', errors='ignore') as f:
                contexts.append(f"File: {match['id']}\n{f.read()}")

        # Prepare augmented query
        augmented_query = (
            "You are a senior software engineer helping students to understand their codebase. With your knowledge and expertise and the given context, "
            "answer the following question:\n\n"
            "Context:\n" + "\n---\n".join(contexts) + "\n\n"
            f"Question: {request.query}"
        )

        # Get response from LLM (using Groq in this example)
        client = openai.OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=os.environ.get("GROQ_API_KEY")
        )
    
        response = client.chat.completions.create(
            model="mixtral-8x7b-32768",  # or your preferred model
            messages=[{"role": "user", "content": augmented_query}],
            temperature=0.7
        )

        return {
            "status": "success",
            "response": response.choices[0].message.content,
            "context_files": [match['id'] for match in search_results['matches']]
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
