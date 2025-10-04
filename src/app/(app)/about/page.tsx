"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Github,
  Linkedin,
  Twitter,
  Mail,
  MapPin,
  Calendar,
  Award,
  Code,
  Palette,
  Users,
  Target,
  Zap,
  Shield,
  Smartphone,
  Globe,
  Database,
  Cloud,
  Star,
  ExternalLink,
  Heart,
  Sparkles,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  Rocket,
  Lightbulb,
  Trophy,
  Quote,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const developers = [
  {
    name: "Roshan Sahu",
    role: "Lead Developer & Co-Founder",
    avatar: "https://picsum.photos/seed/roshan/300/300",
    hint: "experienced software engineer and technical leader",
    bio: "Passionate full-stack developer and technical architect with 5+ years of experience in building scalable web applications and streaming platforms. Expertise in React, Node.js, cloud technologies, and system architecture. Led development of multiple high-traffic platforms serving millions of users, with a focus on performance optimization and user experience. Currently leading the development of PlayNite, a next-generation streaming platform that combines cutting-edge technology with community-driven content discovery.",
    location: "Odisha, India",
    experience: "5+ years",
    joinedDate: "January 2024",
    education: "Bachelor's in Computer Science Engineering",
    tagline: "Building the future of streaming, one line of code at a time",
    expertise: [
      "System Architecture & Design",
      "Performance Optimization",
      "Team Leadership & Mentoring",
      "Cloud Infrastructure Management",
      "API Design & Development",
      "Database Design & Optimization",
      "DevOps & CI/CD Pipelines"
    ],
    skills: [
      "React", "Next.js", "TypeScript", "Node.js", "Python",
      "PostgreSQL", "MongoDB", "AWS", "Docker", "GraphQL",
      "Redis", "Kubernetes", "CI/CD", "Microservices",
      "Socket.io", "WebRTC", "FFmpeg", "Nginx"
    ],
    achievements: [
      "Built streaming platform with 100k+ users",
      "Led team of 5 developers successfully",
      "Reduced server costs by 40% through optimization",
      "Implemented real-time features scaling to 10k+ concurrent users",
      "Architected microservices handling 1M+ requests daily",
      "Mentored 3 junior developers to mid-level positions",
      "Developed video streaming infrastructure from scratch",
      "Implemented AI-powered content recommendation system"
    ],
    certifications: [
      "AWS Solutions Architect Associate",
      "MongoDB Certified Developer",
      "React Advanced Certification",
      "Node.js Application Development"
    ],
    stats: {
      projects: 25,
      experience: "5+ years",
      clients: 15,
      awards: 3
    },
    social: {
      github: "https://github.com/roshan8800",
      linkedin: "https://linkedin.com/in/roshansahu",
      twitter: "https://twitter.com/roshansahu",
      email: "roshan@playnite.com",
      portfolio: "https://roshansahu.dev",
      discord: "https://discord.gg/roshansahu"
    }
  },
  {
    name: "Papun Sahu",
    role: "UI/UX Designer & Frontend Developer",
    avatar: "https://picsum.photos/seed/papun/300/300",
    hint: "creative designer and frontend specialist",
    bio: "Creative UI/UX designer and frontend developer with a passion for crafting beautiful, intuitive user experiences that delight users. Combines artistic vision with technical expertise to create engaging digital products. Specializes in user-centered design thinking and modern frontend technologies. Currently leading the design and frontend development of PlayNite, focusing on creating an immersive and accessible streaming experience that brings people together through shared entertainment.",
    location: "Odisha, India",
    experience: "3+ years",
    joinedDate: "January 2024",
    education: "Bachelor's in Design & Visual Communication",
    tagline: "Designing experiences that connect hearts and screens",
    expertise: [
      "User Experience Research",
      "Interaction Design",
      "Design Systems Creation",
      "Frontend Performance",
      "Accessibility & Inclusive Design",
      "Brand Identity & Strategy",
      "Motion Graphics & Animation"
    ],
    skills: [
      "Figma", "Adobe XD", "React", "Vue.js", "CSS3",
      "JavaScript", "Tailwind CSS", "SASS", "Prototyping", "User Research",
      "Framer Motion", "Three.js", "GSAP", "Design Systems",
      "Blender", "After Effects", "Principle", "InVision"
    ],
    achievements: [
      "Designed 20+ mobile and web applications",
      "Increased user engagement by 60% through UX improvements",
      "Won 'Best Design Excellence' award at TechCrunch",
      "Led UX research for 10+ successful projects",
      "Created design system used by 50+ developers",
      "Improved app performance scores by 35%",
      "Designed PlayNite's signature visual identity",
      "Implemented accessibility standards across all platforms"
    ],
    certifications: [
      "Google UX Design Professional Certificate",
      "Adobe Certified Expert - XD",
      "Meta Front-End Developer Certificate",
      "Interaction Design Foundation"
    ],
    stats: {
      projects: 30,
      experience: "3+ years",
      clients: 20,
      awards: 5
    },
    social: {
      github: "https://github.com/papunsahu",
      linkedin: "https://linkedin.com/in/papunsahu8800",
      twitter: "https://twitter.com/papunsahu",
      email: "papun@playnite.com",
      portfolio: "https://papunsahu.design",
      dribbble: "https://dribbble.com/papunsahu",
      behance: "https://behance.net/papunsahu"
    }
  },
];

const technologies = [
  {
    category: "Frontend",
    icon: <Globe className="h-5 w-5" />,
    tech: ["React 18", "Next.js 14", "TypeScript", "Tailwind CSS", "Framer Motion"]
  },
  {
    category: "Backend",
    icon: <Database className="h-5 w-5" />,
    tech: ["Node.js", "Express.js", "GraphQL", "REST APIs", "Microservices"]
  },
  {
    category: "Database",
    icon: <Database className="h-5 w-5" />,
    tech: ["PostgreSQL", "MongoDB", "Redis", "Prisma ORM", "Database Optimization"]
  },
  {
    category: "Cloud & DevOps",
    icon: <Cloud className="h-5 w-5" />,
    tech: ["AWS", "Docker", "Kubernetes", "CI/CD", "Monitoring"]
  },
  {
    category: "Mobile & PWA",
    icon: <Smartphone className="h-5 w-5" />,
    tech: ["React Native", "PWA", "Responsive Design", "Mobile-First", "App Store Optimization"]
  },
  {
    category: "Security & Performance",
    icon: <Shield className="h-5 w-5" />,
    tech: ["Authentication", "Authorization", "Data Encryption", "Performance Optimization", "Security Auditing"]
  }
];

const projectVision = {
  mission: "To democratize premium streaming content and create a platform where users can discover, share, and enjoy high-quality entertainment while connecting with like-minded individuals globally.",
  vision: "To become the world's most loved streaming platform that not only entertains but also builds communities around shared interests and passions.",
  values: [
    "Innovation in technology and user experience",
    "Community-first approach to content discovery",
    "Accessibility and inclusivity for all users",
    "Privacy and security as top priorities",
    "Continuous learning and improvement"
  ]
};

const journeyTimeline = [
  {
    year: "2024",
    month: "January",
    title: "PlayNite Founded",
    description: "Roshan and Papun started PlayNite with a vision to revolutionize streaming",
    icon: <Rocket className="h-5 w-5" />,
    color: "from-blue-500 to-purple-600",
    achievements: ["Initial concept development", "Team formation", "First prototype"]
  },
  {
    year: "2024",
    month: "March",
    title: "MVP Development",
    description: "Launched minimum viable product with core streaming features",
    icon: <Code className="h-5 w-5" />,
    color: "from-green-500 to-teal-600",
    achievements: ["Basic video streaming", "User authentication", "Content upload system"]
  },
  {
    year: "2024",
    month: "June",
    title: "Beta Launch",
    description: "Released beta version to early adopters and gathered feedback",
    icon: <Users className="h-5 w-5" />,
    color: "from-orange-500 to-red-600",
    achievements: ["100+ beta users", "Community features", "Mobile responsiveness"]
  },
  {
    year: "2024",
    month: "September",
    title: "Full Launch",
    description: "Official launch with advanced features and global availability",
    icon: <Globe className="h-5 w-5" />,
    color: "from-purple-500 to-pink-600",
    achievements: ["Global CDN setup", "Advanced AI features", "Multi-language support"]
  },
  {
    year: "2024",
    month: "December",
    title: "Growth Milestone",
    description: "Reached 10,000+ active users and expanded content library",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "from-indigo-500 to-blue-600",
    achievements: ["10k+ users", "Content partnerships", "Revenue generation"]
  }
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Content Creator",
    company: "Tech Insights",
    avatar: "https://picsum.photos/seed/sarah/100/100",
    content: "PlayNite has revolutionized how I share my content. The platform's intuitive design and powerful features make streaming effortless.",
    rating: 5,
    metrics: "2M+ views generated"
  },
  {
    name: "Michael Chen",
    role: "Software Engineer",
    company: "InnovateCorp",
    avatar: "https://picsum.photos/seed/michael/100/100",
    content: "As a developer, I appreciate the clean architecture and robust API. PlayNite sets the standard for modern streaming platforms.",
    rating: 5,
    metrics: "Built 3 integrations"
  },
  {
    name: "Emily Rodriguez",
    role: "Digital Marketer",
    company: "Growth Partners",
    avatar: "https://picsum.photos/seed/emily/100/100",
    content: "The analytics and insights provided by PlayNite have been game-changing for our content strategy. Highly recommended!",
    rating: 5,
    metrics: "150% engagement increase"
  }
];

const projectMetrics = {
  users: { current: 150000, target: 1000000, label: "Active Users" },
  content: { current: 50000, target: 100000, label: "Content Pieces" },
  uptime: { current: 99.9, target: 99.9, label: "Uptime %" },
  performance: { current: 95, target: 100, label: "Performance Score" },
  satisfaction: { current: 4.8, target: 5.0, label: "User Satisfaction" }
};

export default function AboutPage() {
  const [activeTimeline, setActiveTimeline] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto py-16 px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                About PlayNite
              </h1>
              <Sparkles className="h-8 w-8 text-secondary animate-pulse" />
            </div>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Revolutionizing the streaming experience with cutting-edge technology,
              curated content, and a community-driven approach to entertainment.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Users className="h-4 w-4 mr-2" />
                Community First
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Zap className="h-4 w-4 mr-2" />
                Innovation Driven
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Heart className="h-4 w-4 mr-2" />
                User Centric
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Vision & Mission Section */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Our Foundation
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Vision & Mission
            </h2>
            <p className="text-muted-foreground text-xl max-w-3xl mx-auto leading-relaxed">
              Discover what drives us and the values that shape every aspect of PlayNite's journey
            </p>
          </div>

          <Tabs defaultValue="mission" className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-12 h-14 bg-muted/50 backdrop-blur-sm">
              <TabsTrigger value="mission" className="flex items-center gap-3 text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">
                <Target className="h-5 w-5" />
                Our Mission
              </TabsTrigger>
              <TabsTrigger value="vision" className="flex items-center gap-3 text-base font-semibold data-[state=active]:bg-secondary data-[state=active]:text-white transition-all duration-300">
                <Star className="h-5 w-5" />
                Our Vision
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mission" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-accent/5 border-primary/20 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl text-primary">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Target className="h-7 w-7" />
                      </div>
                      Mission Statement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-lg leading-relaxed text-muted-foreground">{projectVision.mission}</p>
                    <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                      <h3 className="text-xl font-semibold mb-4 text-primary flex items-center gap-2">
                        <Heart className="h-5 w-5" />
                        Core Values
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {projectVision.values.map((value, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg hover:bg-background/80 transition-colors">
                            <div className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground leading-relaxed">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-accent/5 to-secondary/5 border-accent/20 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl text-accent">
                      <div className="p-3 bg-accent/10 rounded-xl">
                        <Zap className="h-7 w-7" />
                      </div>
                      What We Do
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-lg">
                        <Users className="h-5 w-5 text-accent" />
                        <span className="text-sm font-medium">Build inclusive streaming communities</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-lg">
                        <Globe className="h-5 w-5 text-accent" />
                        <span className="text-sm font-medium">Democratize premium content access</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-lg">
                        <Code className="h-5 w-5 text-accent" />
                        <span className="text-sm font-medium">Innovate with cutting-edge technology</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="vision" className="space-y-8">
              <div className="text-center mb-8">
                <Card className="bg-gradient-to-br from-secondary/5 via-primary/5 to-accent/5 border-secondary/20 hover:shadow-xl transition-all duration-500 max-w-4xl mx-auto">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center justify-center gap-3 text-2xl text-secondary">
                      <div className="p-3 bg-secondary/10 rounded-xl">
                        <Star className="h-7 w-7" />
                      </div>
                      Vision Statement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-6">
                    <p className="text-xl leading-relaxed text-muted-foreground max-w-3xl mx-auto">
                      {projectVision.vision}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                      <div className="p-6 bg-secondary/5 rounded-xl border border-secondary/10">
                        <div className="text-3xl font-bold text-secondary mb-2">2024</div>
                        <div className="text-sm text-muted-foreground">Foundation Year</div>
                      </div>
                      <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
                        <div className="text-3xl font-bold text-primary mb-2">1M+</div>
                        <div className="text-sm text-muted-foreground">Target Users</div>
                      </div>
                      <div className="p-6 bg-accent/5 rounded-xl border border-accent/10">
                        <div className="text-3xl font-bold text-accent mb-2">Global</div>
                        <div className="text-sm text-muted-foreground">Community Reach</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Technology Stack Section */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Code className="h-4 w-4" />
              Powering Innovation
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Technology Stack
            </h2>
            <p className="text-muted-foreground text-xl max-w-3xl mx-auto leading-relaxed">
              Built with modern technologies for scalability, performance, and exceptional user experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {technologies.map((category, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm border-2 hover:border-primary/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="relative z-10 pb-4">
                  <CardTitle className="flex items-center gap-4 text-xl">
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl text-primary group-hover:from-primary group-hover:to-secondary group-hover:text-white transition-all duration-300 group-hover:scale-110">
                      {category.icon}
                    </div>
                    <span className="group-hover:text-primary transition-colors duration-300">
                      {category.category}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="flex flex-wrap gap-3">
                    {category.tech.map((tech, techIndex) => (
                      <Badge
                        key={techIndex}
                        variant="outline"
                        className="text-sm px-3 py-1 bg-background/50 hover:bg-primary hover:text-white transition-all duration-300 cursor-default border-primary/20 hover:border-primary"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Production Ready</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Tech Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime SLA</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl border border-secondary/20">
              <div className="text-3xl font-bold text-secondary mb-2">{"<"}100ms</div>
              <div className="text-sm text-muted-foreground">Response Time</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl border border-accent/20">
              <div className="text-3xl font-bold text-accent mb-2">50+</div>
              <div className="text-sm text-muted-foreground">Technologies</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-secondary/10 rounded-xl border border-primary/20">
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Monitoring</div>
            </div>
          </div>
        </section>

        {/* Project Metrics Section */}
        <section className="mb-20 animate-on-scroll">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Activity className="h-4 w-4" />
              Live Metrics
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Project Statistics
            </h2>
            <p className="text-muted-foreground text-xl max-w-3xl mx-auto leading-relaxed">
              Real-time insights into PlayNite's growth and performance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {Object.entries(projectMetrics).map(([key, metric], index) => (
              <Card key={key} className={`group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm border-2 hover:border-primary/30 relative overflow-hidden ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${index * 100}ms` }}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="relative z-10 pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl text-primary group-hover:from-primary group-hover:to-secondary group-hover:text-white transition-all duration-300 group-hover:scale-110">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <span className="group-hover:text-primary transition-colors duration-300">
                      {metric.label}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="text-4xl font-bold text-primary">
                      {typeof metric.current === 'number' && metric.current < 1
                        ? metric.current.toFixed(1)
                        : metric.current.toLocaleString()
                      }
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      / {typeof metric.target === 'number' && metric.target < 1
                        ? metric.target.toFixed(1)
                        : metric.target.toLocaleString()
                      }
                    </div>
                  </div>
                  <Progress
                    value={(metric.current / metric.target) * 100}
                    className="h-3 bg-primary/10"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {Math.round((metric.current / metric.target) * 100)}% of target
                    </span>
                    <div className="flex items-center gap-1 text-green-600">
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-xs font-medium">Growing</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Interactive Timeline Section */}
        <section className="mb-20 animate-on-scroll">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Clock className="h-4 w-4" />
              Our Journey
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              PlayNite Timeline
            </h2>
            <p className="text-muted-foreground text-xl max-w-3xl mx-auto leading-relaxed">
              Follow our incredible journey from concept to the platform we are today
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-primary via-accent to-secondary opacity-30" />

              <div className="space-y-16">
                {journeyTimeline.map((milestone, index) => (
                  <div
                    key={index}
                    className={`relative flex items-center gap-8 ${
                      index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                    } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ transitionDelay: `${index * 200}ms` }}
                  >
                    {/* Timeline Node */}
                    <div className={`absolute left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br ${milestone.color} flex items-center justify-center shadow-2xl z-10 hover:scale-110 transition-all duration-300 cursor-pointer`} onClick={() => setActiveTimeline(index)}>
                      <div className={`p-2 rounded-full bg-white/20 ${activeTimeline === index ? 'bg-white/40' : ''}`}>
                        {milestone.icon}
                      </div>
                    </div>

                    {/* Content Card */}
                    <div className={`w-5/12 ${index % 2 === 0 ? 'pr-8' : 'pl-8'}`}>
                      <Card className={`group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm border-2 hover:border-primary/30 relative overflow-hidden ${activeTimeline === index ? 'ring-2 ring-primary/50 shadow-primary/20' : ''}`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${milestone.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                        <CardHeader className="relative z-10 pb-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                              {milestone.month} {milestone.year}
                            </Badge>
                          </div>
                          <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">
                            {milestone.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10 space-y-4">
                          <p className="text-muted-foreground leading-relaxed">
                            {milestone.description}
                          </p>
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-primary">Key Achievements:</h4>
                            <div className="grid grid-cols-1 gap-2">
                              {milestone.achievements.map((achievement, achievementIndex) => (
                                <div key={achievementIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  {achievement}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Spacer for opposite side */}
                    <div className="w-5/12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="mb-20 animate-on-scroll">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Quote className="h-4 w-4" />
              Success Stories
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              What People Say
            </h2>
            <p className="text-muted-foreground text-xl max-w-3xl mx-auto leading-relaxed">
              Hear from our community of creators, developers, and partners
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className={`group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 bg-card/80 backdrop-blur-sm border-2 hover:border-primary/30 relative overflow-hidden ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${index * 150}ms` }}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Quote Icon */}
                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                  <Quote className="h-12 w-12 text-primary" />
                </div>

                <CardContent className="relative z-10 p-8">
                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Testimonial Content */}
                  <blockquote className="text-muted-foreground leading-relaxed mb-6 italic">
                    "{testimonial.content}"
                  </blockquote>

                  {/* Author Info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                        {testimonial.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      <div className="text-sm text-primary font-medium">{testimonial.company}</div>
                    </div>
                  </div>

                  {/* Metrics Badge */}
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">
                      {testimonial.metrics}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Users className="h-4 w-4" />
              The Dream Team
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Meet the Creators
            </h2>
            <p className="text-muted-foreground text-xl max-w-3xl mx-auto leading-relaxed">
              The passionate minds behind PlayNite, bringing together technical expertise and creative vision
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {developers.map((dev, index) => (
              <Card key={dev.name} className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 bg-card/80 backdrop-blur-sm border-2 hover:border-primary/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="relative z-10 pb-6">
                  <div className="flex items-start gap-6">
                    <div className="relative">
                      <Avatar className="h-28 w-28 border-4 border-primary/20 group-hover:border-primary/50 transition-all duration-300 group-hover:scale-105">
                        <AvatarImage src={dev.avatar} alt={dev.name} data-ai-hint={dev.hint} />
                        <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-secondary text-white">
                          {dev.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Award className="h-5 w-5 text-white" />
                      </div>
                      <div className="absolute -top-2 -left-2 h-6 w-6 bg-green-500 rounded-full animate-pulse shadow-lg" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-3xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">
                        {dev.name}
                      </CardTitle>
                      <p className="text-accent font-semibold text-lg mb-3">{dev.role}</p>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          {dev.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-secondary" />
                          {dev.experience}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary">Education:</span> {dev.education}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 space-y-6">
                  <p className="text-muted-foreground leading-relaxed text-lg">{dev.bio}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                        <Code className="h-5 w-5 text-primary" />
                        Technical Skills
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {dev.skills.slice(0, 7).map((skill, skillIndex) => (
                          <Badge key={skillIndex} variant="secondary" className="text-xs hover:bg-primary hover:text-white transition-colors cursor-default">
                            {skill}
                          </Badge>
                        ))}
                        {dev.skills.length > 7 && (
                          <Badge variant="outline" className="text-xs">
                            +{dev.skills.length - 7} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                        <Award className="h-5 w-5 text-secondary" />
                        Key Achievements
                      </h4>
                      <ul className="space-y-2">
                        {dev.achievements.slice(0, 3).map((achievement, achievementIndex) => (
                          <li key={achievementIndex} className="flex items-start gap-3 text-sm text-muted-foreground">
                            <div className="h-2 w-2 bg-gradient-to-r from-primary to-secondary rounded-full mt-2 flex-shrink-0" />
                            {achievement}
                          </li>
                        ))}
                        {dev.achievements.length > 3 && (
                          <li className="text-sm text-primary font-medium">
                            +{dev.achievements.length - 3} more achievements
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {dev.certifications && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                        <Star className="h-5 w-5 text-accent" />
                        Certifications
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {dev.certifications.map((cert, certIndex) => (
                          <Badge key={certIndex} variant="outline" className="text-xs border-accent/50 text-accent hover:bg-accent hover:text-white transition-colors">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                  <div>
                    <h4 className="font-semibold mb-4 text-lg">Connect & Follow</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button size="sm" variant="outline" asChild className="hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 hover:scale-105">
                        <a href={dev.social.github} target="_blank" rel="noopener noreferrer">
                          <Github className="h-4 w-4 mr-2" />
                          GitHub
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 hover:scale-105">
                        <a href={dev.social.linkedin} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                        </a>
                      </Button>
                      {dev.social.portfolio && (
                        <Button size="sm" variant="outline" asChild className="hover:bg-accent hover:text-white hover:border-accent transition-all duration-300 hover:scale-105">
                          <a href={dev.social.portfolio} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Portfolio
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" asChild className="hover:bg-secondary hover:text-white hover:border-secondary transition-all duration-300 hover:scale-105">
                        <a href={`mailto:${dev.social.email}`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Mail className="h-4 w-4" />
              Let's Connect
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Get In Touch
            </h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
              Have questions about PlayNite? Want to collaborate or just say hello?
              We'd love to hear from you!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center justify-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Mail className="h-7 w-7 text-primary" />
                  </div>
                  Email Us
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  For business inquiries, partnerships, and general questions
                </p>
                <Button asChild size="lg" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-lg px-8">
                  <a href="mailto:hello@playnite.com">
                    <Mail className="h-5 w-5 mr-2" />
                    hello@playnite.com
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center justify-center gap-3">
                  <div className="p-3 bg-accent/10 rounded-xl">
                    <Github className="h-7 w-7 text-accent" />
                  </div>
                  View Source
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Explore our codebase, contribute, or report issues
                </p>
                <Button variant="outline" asChild size="lg" className="text-lg px-8 hover:bg-accent hover:text-white hover:border-accent transition-all duration-300">
                  <a href="https://github.com/playnite" target="_blank" rel="noopener noreferrer">
                    <Github className="h-5 w-5 mr-2" />
                    View on GitHub
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Contact Info */}
          <Card className="max-w-4xl mx-auto bg-gradient-to-br from-background/50 to-muted/30 backdrop-blur-sm border-2">
            <CardContent className="pt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="space-y-2">
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mx-auto">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Location</h3>
                  <p className="text-muted-foreground text-sm">Odisha, India</p>
                  <p className="text-muted-foreground text-sm">Remote-First Team</p>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-secondary/10 rounded-xl w-fit mx-auto">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold">Team Size</h3>
                  <p className="text-muted-foreground text-sm">Growing Team</p>
                  <p className="text-muted-foreground text-sm">Passionate Developers</p>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-accent/10 rounded-xl w-fit mx-auto">
                    <Globe className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-semibold">Availability</h3>
                  <p className="text-muted-foreground text-sm">24/7 Support</p>
                  <p className="text-muted-foreground text-sm">Global Community</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
