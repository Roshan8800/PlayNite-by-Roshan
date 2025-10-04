"use client";

import { useState } from "react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  Star,
  Zap,
  Shield,
  Download,
  PlayCircle,
  Users,
  Infinity,
  Crown,
  Sparkles,
  ArrowRight,
  X
} from "lucide-react";

const premiumVideos = PlaceHolderImages.filter((img) => img.id.startsWith("video-")).slice(0, 6);

const pricingTiers = [
  {
    name: "Basic",
    price: "$4.99",
    period: "/month",
    description: "Perfect for casual viewers",
    features: [
      "HD video quality",
      "Watch on 1 device",
      "Limited offline downloads",
      "Basic support",
      "Ad-free experience"
    ],
    popular: false,
    color: "border-border",
    buttonVariant: "outline" as const,
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "/month",
    description: "Most popular choice",
    features: [
      "4K Ultra HD quality",
      "Watch on 4 devices",
      "Unlimited offline downloads",
      "Priority support",
      "Ad-free experience",
      "Exclusive premium content",
      "Live chat support"
    ],
    popular: true,
    color: "border-primary bg-primary/5",
    buttonVariant: "default" as const,
  },
  {
    name: "Ultimate",
    price: "$19.99",
    period: "/month",
    description: "For the ultimate experience",
    features: [
      "8K Ultra HD quality",
      "Watch on unlimited devices",
      "Unlimited offline downloads",
      "24/7 premium support",
      "Ad-free experience",
      "Exclusive premium content",
      "Early access to new features",
      "Custom recommendations",
      "Family sharing included"
    ],
    popular: false,
    color: "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
    buttonVariant: "outline" as const,
  },
];

const premiumBenefits = [
  {
    icon: PlayCircle,
    title: "4K Ultra HD Streaming",
    description: "Experience crystal-clear video quality with our premium streaming technology."
  },
  {
    icon: Download,
    title: "Offline Downloads",
    description: "Download your favorite content and watch it anywhere, even without internet."
  },
  {
    icon: Shield,
    title: "Ad-Free Experience",
    description: "Enjoy uninterrupted viewing with no advertisements or interruptions."
  },
  {
    icon: Users,
    title: "Multiple Devices",
    description: "Stream on multiple devices simultaneously with family sharing options."
  },
  {
    icon: Star,
    title: "Exclusive Content",
    description: "Access premium-only content and early releases before anyone else."
  },
  {
    icon: Zap,
    title: "Priority Support",
    description: "Get help when you need it with our dedicated premium support team."
  },
];

export default function PremiumPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedTier, setSelectedTier] = useState("Premium");

  const getAnnualPrice = (monthlyPrice: string) => {
    const price = parseFloat(monthlyPrice.replace('$', ''));
    const annualPrice = price * 12 * 0.8; // 20% discount
    return `$${Math.round(annualPrice * 100) / 100}`;
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Unlock Premium Features
          </h1>
          <p className="text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">
            Elevate your viewing experience with premium quality, exclusive content, and advanced features.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span className={isAnnual ? "text-muted-foreground" : "font-semibold"}>Monthly</span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            className="data-[state=checked]:bg-amber-500"
          />
          <span className={isAnnual ? "font-semibold" : "text-muted-foreground"}>
            Annual
            <Badge variant="secondary" className="ml-2 text-xs">Save 20%</Badge>
          </span>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section>
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative transition-all hover:shadow-lg ${
                tier.popular ? "ring-2 ring-primary shadow-lg scale-105" : "hover:scale-102"
              } ${tier.color}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="pt-4">
                  <div className="text-4xl font-bold">
                    {isAnnual ? getAnnualPrice(tier.price) : tier.price}
                    <span className="text-base font-normal text-muted-foreground">
                      {isAnnual ? "/year" : tier.period}
                    </span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Save ${(parseFloat(tier.price.replace('$', '')) * 12 * 0.2).toFixed(0)} annually
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.buttonVariant}
                  size="lg"
                  onClick={() => setSelectedTier(tier.name)}
                >
                  {selectedTier === tier.name ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    <>
                      Get {tier.name}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Premium Benefits */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Why Choose Premium?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover the exclusive benefits that make premium membership worthwhile
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {premiumBenefits.map((benefit, index) => (
            <Card key={index} className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Premium Content Preview */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-amber-500" />
            Premium Content Preview
          </h2>
          <p className="text-muted-foreground">
            Get a taste of the exclusive content available to premium members
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {premiumVideos.map((video, index) => (
            <Card key={video.id} className="overflow-hidden group transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="p-0 relative">
                <Image
                  src={video.imageUrl}
                  alt={video.description}
                  width={400}
                  height={225}
                  className="w-full h-auto aspect-video object-cover"
                  data-ai-hint={video.imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-amber-500 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-16 h-16 text-white/80" />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-base font-bold leading-tight line-clamp-2 mb-2">
                  {video.description}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Premium exclusive content
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    4K Quality
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.floor(Math.random() * 100) + 20}K views
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-8 text-center text-white">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-4">Ready to Upgrade?</h2>
            <p className="text-amber-100">
              Join thousands of premium members enjoying the ultimate viewing experience.
              Start your premium journey today!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-amber-600 hover:bg-amber-50">
              <Crown className="w-5 h-5 mr-2" />
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Compare Plans
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <p className="text-sm text-amber-100">
            30-day free trial • Cancel anytime • No hidden fees
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
          {[
            {
              question: "Can I cancel my subscription anytime?",
              answer: "Yes, you can cancel your premium subscription at any time. You'll continue to have access until the end of your billing period."
            },
            {
              question: "What payment methods do you accept?",
              answer: "We accept all major credit cards, PayPal, and other popular payment methods for your convenience."
            },
            {
              question: "Can I share my premium account?",
              answer: "Premium plans allow simultaneous streaming on multiple devices. Ultimate plan includes family sharing features."
            },
            {
              question: "Is there a free trial available?",
              answer: "Yes! We offer a 30-day free trial for all premium plans. No credit card required to start."
            },
          ].map((faq, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}