"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function MainPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to the Main Screen</h1>
        <p className="text-lg text-gray-600 mb-8">
          You have successfully completed the verification process.
        </p>
        <Button onClick={() => router.push("/")}>
          Go back to Age Verification
        </Button>
      </div>
    </main>
  );
}