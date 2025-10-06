"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayNiteLogo } from "@/components/playnite-logo";
import { Heart, Users, Sparkles } from "lucide-react";

type Gender = "male" | "female" | null;

export default function GenderSelectionPage() {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState<Gender>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenderSelection = (gender: Gender) => {
    setSelectedGender(gender);
  };

  const handleContinue = () => {
    if (selectedGender) {
      setIsLoading(true);
      setTimeout(() => {
        router.push("/18plus?verified=true");
      }, 1000);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <div className="absolute top-8">
        <PlayNiteLogo />
      </div>

      <Card className="w-full max-w-md bg-black border-gray-800">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-6 w-6 text-pink-500" />
            <CardTitle className="text-2xl text-white">Choose Your Guide</CardTitle>
            <Heart className="h-6 w-6 text-pink-500" />
          </div>
          <p className="text-gray-400 text-sm">
            Select your preferred guide to continue your journey
          </p>
          <div className="flex items-center justify-center gap-1 text-pink-500">
            <span className="text-lg">💗</span>
            <span className="text-lg">💗</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {/* Male Selection Card */}
            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                selectedGender === "male"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-700 bg-gray-900 hover:border-gray-600"
              }`}
              onClick={() => handleGenderSelection("male")}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <Users className="h-8 w-8 text-blue-400" />
                  <div className="text-2xl">👨‍🦱</div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Male Guide</h3>
                  <p className="text-gray-400 text-sm">
                    Continue to PlayNite - Your Journey Awaits
                  </p>
                </div>
                {selectedGender === "male" && (
                  <div className="flex items-center justify-center gap-2 text-blue-400">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">Selected</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Female Selection Card */}
            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                selectedGender === "female"
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-gray-700 bg-gray-900 hover:border-gray-600"
              }`}
              onClick={() => handleGenderSelection("female")}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <Users className="h-8 w-8 text-pink-400" />
                  <div className="text-2xl">👩‍🦰</div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Female Guide</h3>
                  <p className="text-gray-400 text-sm">
                    Continue to PlayNite - Your Journey Awaits
                  </p>
                </div>
                {selectedGender === "female" && (
                  <div className="flex items-center justify-center gap-2 text-pink-400">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">Selected</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!selectedGender || isLoading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            {isLoading
              ? "Loading..."
              : selectedGender
              ? "Continue to PlayNite"
              : "Select a Guide"}
          </Button>

          <div className="text-center text-xs text-gray-500">
            Choose your guide to unlock personalized content and experiences
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
