"use client";

import { useState, useEffect } from "react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  MoreVertical,
  PlayCircle,
  Shield,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  CheckCircle
} from "lucide-react";

const adultContent = PlaceHolderImages.filter((img) => img.id.startsWith("video-") || img.id.startsWith("reel-")).slice(0, 12);

export default function EighteenPlusPage() {
   const [isAgeVerified, setIsAgeVerified] = useState(false);
   const [showAgeGate, setShowAgeGate] = useState(true);
   const [ageInput, setAgeInput] = useState("");
   const [error, setError] = useState("");

   // Check if user is coming from Monica flow (already age verified)
   useEffect(() => {
     // Auto-verify if coming from verified flow
     const urlParams = new URLSearchParams(window.location.search);
     const fromVerified = urlParams.get('verified') === 'true';

     if (fromVerified) {
       setIsAgeVerified(true);
       setShowAgeGate(false);
     }
   }, []);

  const handleAgeVerification = () => {
    const age = parseInt(ageInput);
    if (age >= 18) {
      setIsAgeVerified(true);
      setShowAgeGate(false);
      setError("");
    } else {
      setError("You must be 18 or older to access this content.");
    }
  };

  const handleDecline = () => {
    window.history.back();
  };

  // Age verification gate
  if (showAgeGate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Age Verification Required</CardTitle>
            <p className="text-muted-foreground">
              This content is intended for adults 18 years and older only.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                By continuing, you confirm that you are 18 years of age or older and consent to viewing adult content.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label htmlFor="age" className="text-sm font-medium">
                Please enter your age:
              </label>
              <input
                id="age"
                type="number"
                min="1"
                max="120"
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Enter your age"
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={handleDecline} className="flex-1">
              Go Back
            </Button>
            <Button onClick={handleAgeVerification} className="flex-1">
              <Lock className="w-4 h-4 mr-2" />
              Continue
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-8 h-8 text-destructive" />
            18+ Content
          </h1>
          <p className="text-muted-foreground mt-2">
            Exclusive adult content for mature audiences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Age Verified
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAgeGate(true)}
            className="text-muted-foreground"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Re-verify
          </Button>
        </div>
      </div>

      <Separator />

      {/* Featured Adult Content */}
      <section>
        <h2 className="text-2xl font-headline tracking-tight mb-4 flex items-center gap-2">
          <Lock className="w-6 h-6" />
          Premium Adult Content
        </h2>
        <Alert className="mb-6 border-destructive/20 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive/80">
            This content contains mature themes and is intended for adults only. Viewer discretion is advised.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {adultContent.map((content, index) => (
            <Card key={content.id} className="overflow-hidden group transition-all hover:shadow-lg hover:shadow-destructive/20 hover:-translate-y-1 border-destructive/20">
              <CardHeader className="p-0 relative">
                <Image
                  src={content.imageUrl}
                  alt={content.description}
                  width={400}
                  height={225}
                  className="w-full h-auto aspect-video object-cover"
                  data-ai-hint={content.imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-2 right-2">
                  <Badge variant="destructive" className="text-xs">
                    18+
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-16 h-16 text-white/80" />
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium">LIVE</span>
                    </div>
                    <span className="text-xs bg-black/50 px-2 py-1 rounded">
                      {Math.floor(Math.random() * 1000) + 100} watching
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={`https://picsum.photos/seed/adult${index}/40/40`} data-ai-hint="adult content creator" />
                    <AvatarFallback>C{index + 1}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-bold leading-tight line-clamp-2 mb-1">
                      {content.description}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Adult Content Creator</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        Mature
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(Math.random() * 50) + 10}K views
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Adult Categories */}
      <section>
        <h2 className="text-2xl font-headline tracking-tight mb-4">Categories</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Entertainment", count: "2.4K", color: "bg-purple-500" },
            { name: "Educational", count: "856", color: "bg-blue-500" },
            { name: "Documentary", count: "1.2K", color: "bg-green-500" },
            { name: "Live Shows", count: "567", color: "bg-red-500" },
          ].map((category) => (
            <Card key={category.name} className="hover:shadow-md transition-shadow cursor-pointer border-destructive/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.count} videos</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${category.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Safety Notice */}
      <section>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-destructive mt-1" />
              <div>
                <h3 className="font-semibold text-destructive mb-2">Content Safety</h3>
                <p className="text-sm text-muted-foreground">
                  All content on this page is moderated and complies with our community guidelines.
                  We prioritize user safety and provide tools to report inappropriate content.
                  If you encounter any issues, please use the report feature or contact our support team.
                </p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    Report Content
                  </Button>
                  <Button variant="outline" size="sm">
                    Safety Guidelines
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}