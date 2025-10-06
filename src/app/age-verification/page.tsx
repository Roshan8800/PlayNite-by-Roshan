"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayNiteLogo } from "@/components/playnite-logo";
import { Calendar, CheckCircle, XCircle, Shield } from "lucide-react";

export default function AgeVerificationPage() {
  const router = useRouter();
  const [birthday, setBirthday] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate age whenever birthday changes
  useEffect(() => {
    if (birthday) {
      const birthDate = new Date(birthday);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }

      setAge(calculatedAge);
    } else {
      setAge(null);
    }
  }, [birthday]);

  const isEligible = age !== null && age >= 18;

  const handleContinue = () => {
    if (isEligible) {
      setIsLoading(true);
      // Simulate verification process
      setTimeout(() => {
        router.push("/gender");
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
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl text-white">Age Verification</CardTitle>
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <p className="text-gray-400 text-sm">
            Please verify your age to continue using PlayNite
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="birthday" className="text-white">
              Date of Birth
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-white focus:border-primary"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {age !== null && (
            <div className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-gray-900 border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">Calculated Age</div>
                <div className="text-2xl font-bold text-white">{age} years old</div>
              </div>

              <div className="flex items-center justify-center gap-2 p-3 rounded-lg border-2"
                   style={{
                     backgroundColor: isEligible ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                     borderColor: isEligible ? '#22c55e' : '#ef4444'
                   }}>
                {isEligible ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-500 font-medium">Eligible (18+)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-500 font-medium">Must be 18 or older</span>
                  </>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!isEligible || isLoading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            {isLoading ? (
              "Verifying..."
            ) : isEligible ? (
              "Continue to PlayNite"
            ) : (
              "Age Verification Required"
            )}
          </Button>

          <div className="text-center text-xs text-gray-500">
            By continuing, you confirm you are 18 years or older
          </div>
        </CardContent>
      </Card>
    </main>
  );
}