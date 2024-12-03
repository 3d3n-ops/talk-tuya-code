"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("http://127.0.0.1:8000/process-repo/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: repoUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to process repository");
      }

      const data = await response.json();
      console.log("Backend response:", data);

      router.push("/chat");
    } catch (error: unknown) {
      console.error("Error:", error instanceof Error ? error.message : error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid place-items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] text-white">
      <main className="flex flex-col gap-8 row-start-2 items-center">
        <h1 className="text-4xl sm:text-6xl lg:text-txl text center tracking-wide">
          Talk Tuh-ya Code
        </h1>
        <h2 className="flex items text-align gap-2 text-lg sm:text-xl">
          Literally...
          <Image
            src="sweat-droplets.svg"
            alt="Talk Tu-ya Code Logo"
            width={20}
            height={20}
            className="inline-clock"
          />
        </h2>
        <h3>
          Enter your Github Repo and get to "
          <span style={{ fontStyle: "italic" }}>tuah-king</span>"
        </h3>
        <>
          <div className="text-black">
            <input
              type="text"
              placeholder="Enter Github repo URL"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSubmit}
              type="button"
              className="ml-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Enter"}
            </button>
          </div>
        </>
      </main>
    </div>
  );
}
