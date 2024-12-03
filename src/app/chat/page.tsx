"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
  context_files?: string[];
}

interface BotResponse {
  role: "assistant";
  content: string;
  context_files?: string[];
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "" || isLoading) return;

    const userMessage: Message = { role: "user", content: inputMessage };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/query-codebase/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: inputMessage,
          namespace: "default-namespace",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("API Error:", errorData);
        throw new Error(`Failed to get response: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "success") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
          },
        ]);
      } else {
        throw new Error(data.message || "Failed to get response");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to get response from the chatbot");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid place-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] text-white">
      <div className="w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="text-2xl mb-4 text-center">Talk Tuh-ya Code Chat</div>

        <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-500 ml-auto"
                    : "bg-gray-700 mr-auto"
                }`}
              >
                {message.role === "user" ? (
                  <div>{message.content}</div>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        code: ({
                          className,
                          children,
                          inline,
                          ...props
                        }: Components["code"]) => (
                          <code
                            className={`${className || ""} ${
                              inline
                                ? "bg-gray-800 px-1 py-0.5 rounded"
                                : "block bg-gray-800 p-2 rounded-lg"
                            }`}
                            {...props}
                          >
                            {children}
                          </code>
                        ),
                        // Style other markdown elements
                        p: ({ children }) => <p className="mb-4">{children}</p>,
                        ul: ({ children }) => (
                          <ul className="list-disc ml-4 mb-4">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal ml-4 mb-4">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="mb-1">{children}</li>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold mb-4">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-bold mb-3">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-bold mb-2">{children}</h3>
                        ),
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            className="text-blue-400 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                    {message.context_files && (
                      <div className="mt-2 text-sm text-gray-400">
                        Referenced files:
                        <ul className="list-disc ml-4">
                          {message.context_files.map((file, i) => (
                            <li key={i}>{file}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="bg-gray-700 max-w-[80%] p-3 rounded-lg mr-auto">
                Thinking...
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            className={`px-6 py-2 bg-blue-500 text-white rounded-lg transition-colors ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
            }`}
            disabled={isLoading}
          >
            Send
          </button>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Back Home
          </button>
        </div>
      </div>
    </div>
  );
}
