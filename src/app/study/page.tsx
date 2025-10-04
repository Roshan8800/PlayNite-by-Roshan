"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BookOpen,
  Brain,
  Calculator,
  Globe,
  Languages,
  Microscope,
  Music,
  Palette,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Trophy,
  Target,
  CheckCircle,
  Clock,
  Star,
  Award,
  TrendingUp,
  Lightbulb,
  FileText,
  Video,
  Headphones,
  Gamepad2,
  ChevronRight,
  Plus,
  Minus
} from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";

interface Subject {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  studyTime: number; // in minutes
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Flashcard {
  id: number;
  front: string;
  back: string;
  subject: string;
}

export default function StudyPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [studyTimer, setStudyTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // Mock data
  const subjects: Subject[] = [
    {
      id: "math",
      name: "Mathematics",
      icon: Calculator,
      color: "bg-blue-500",
      description: "Master numbers, equations, and problem-solving",
      progress: 65,
      totalLessons: 25,
      completedLessons: 16,
      studyTime: 240
    },
    {
      id: "science",
      name: "Science",
      icon: Microscope,
      color: "bg-green-500",
      description: "Explore the wonders of the natural world",
      progress: 40,
      totalLessons: 30,
      completedLessons: 12,
      studyTime: 180
    },
    {
      id: "languages",
      name: "Languages",
      icon: Languages,
      color: "bg-purple-500",
      description: "Learn new languages and communication",
      progress: 80,
      totalLessons: 20,
      completedLessons: 16,
      studyTime: 300
    },
    {
      id: "arts",
      name: "Arts & Music",
      icon: Palette,
      color: "bg-pink-500",
      description: "Express creativity through art and music",
      progress: 30,
      totalLessons: 15,
      completedLessons: 4,
      studyTime: 120
    }
  ];

  const quizQuestions: QuizQuestion[] = [
    {
      id: 1,
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: 2,
      explanation: "Paris is the capital and most populous city of France."
    },
    {
      id: 2,
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctAnswer: 1,
      explanation: "Mars is called the Red Planet because of its reddish appearance."
    },
    {
      id: 3,
      question: "What is 15 × 8?",
      options: ["120", "112", "108", "96"],
      correctAnswer: 0,
      explanation: "15 × 8 = 120. You can calculate this as (10 × 8) + (5 × 8) = 80 + 40 = 120."
    }
  ];

  const flashcards: Flashcard[] = [
    { id: 1, front: "Capital of France", back: "Paris", subject: "Geography" },
    { id: 2, front: "2 + 2 = ?", back: "4", subject: "Math" },
    { id: 3, front: "H₂O", back: "Water", subject: "Science" },
    { id: 4, front: "Hola (Spanish)", back: "Hello", subject: "Languages" },
    { id: 5, front: "Primary Colors", back: "Red, Yellow, Blue", subject: "Arts" },
  ];

  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setStudyTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => setIsTimerRunning(true);
  const pauseTimer = () => setIsTimerRunning(false);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setStudyTimer(0);
  };

  const handleQuizAnswer = (answerIndex: number) => {
    setQuizAnswers(prev => [...prev, answerIndex]);
    if (currentQuizQuestion < quizQuestions.length - 1) {
      setCurrentQuizQuestion(prev => prev + 1);
    } else {
      setShowQuiz(false);
      // Show results or something
    }
  };

  const nextFlashcard = () => {
    if (currentFlashcard < flashcards.length - 1) {
      setCurrentFlashcard(prev => prev + 1);
      setFlashcardFlipped(false);
    }
  };

  const prevFlashcard = () => {
    if (currentFlashcard > 0) {
      setCurrentFlashcard(prev => prev - 1);
      setFlashcardFlipped(false);
    }
  };

  const flipFlashcard = () => {
    setFlashcardFlipped(!flashcardFlipped);
  };

  const totalStudyTime = subjects.reduce((total, subject) => total + subject.studyTime, 0);
  const totalCompletedLessons = subjects.reduce((total, subject) => total + subject.completedLessons, 0);
  const totalLessons = subjects.reduce((total, subject) => total + subject.totalLessons, 0);
  const averageProgress = Math.round(subjects.reduce((total, subject) => total + subject.progress, 0) / subjects.length);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-headline">Study Platform</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enhance your knowledge with interactive learning, progress tracking, and engaging study materials
          </p>
        </div>

        {/* Study Timer */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Study Timer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <div className="text-4xl font-mono font-bold">{formatTime(studyTimer)}</div>
              <div className="flex gap-2">
                <Button
                  onClick={isTimerRunning ? pauseTimer : startTimer}
                  size="sm"
                  variant={isTimerRunning ? "destructive" : "default"}
                >
                  {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button onClick={resetTimer} size="sm" variant="outline">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-8">
            {/* Statistics Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m</div>
                  <p className="text-xs text-muted-foreground">This week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCompletedLessons}/{totalLessons}</div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageProgress}%</div>
                  <p className="text-xs text-muted-foreground">Across all subjects</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Achievements</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">Badges earned</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjects.slice(0, 3).map((subject) => (
                    <div key={subject.id} className="flex items-center gap-4 p-4 rounded-lg bg-accent/20">
                      <div className={`p-2 rounded-full ${subject.color}`}>
                        <subject.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Completed lesson {subject.completedLessons} of {subject.totalLessons}
                        </p>
                      </div>
                      <Badge variant="outline">{subject.progress}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              {subjects.map((subject) => (
                <Card key={subject.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${subject.color}`}>
                          <subject.icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{subject.name}</CardTitle>
                          <CardDescription>{subject.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">{subject.progress}%</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={subject.progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{subject.completedLessons}/{subject.totalLessons} lessons</span>
                      <span>{Math.floor(subject.studyTime / 60)}h study time</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => setSelectedSubject(subject.id)}
                    >
                      Continue Learning
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="space-y-8">
            {!showQuiz ? (
              <Card className="text-center">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Brain className="h-6 w-6" />
                    Interactive Quiz
                  </CardTitle>
                  <CardDescription>
                    Test your knowledge with our interactive quizzes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {subjects.map((subject) => (
                      <Button
                        key={subject.id}
                        variant="outline"
                        className="h-20 flex-col gap-2"
                        onClick={() => setShowQuiz(true)}
                      >
                        <subject.icon className="h-6 w-6" />
                        <span>{subject.name} Quiz</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Quiz Question {currentQuizQuestion + 1} of {quizQuestions.length}</CardTitle>
                  <Progress value={(currentQuizQuestion / quizQuestions.length) * 100} />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl mb-6">{quizQuestions[currentQuizQuestion].question}</h3>
                    <div className="space-y-3">
                      {quizQuestions[currentQuizQuestion].options.map((option, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full text-left justify-start h-auto p-4"
                          onClick={() => handleQuizAnswer(index)}
                        >
                          <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Flashcards Tab */}
          <TabsContent value="flashcards" className="space-y-8">
            {!showFlashcards ? (
              <Card className="text-center">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <FileText className="h-6 w-6" />
                    Flashcards
                  </CardTitle>
                  <CardDescription>
                    Review and memorize key concepts with interactive flashcards
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {subjects.map((subject) => (
                      <Button
                        key={subject.id}
                        variant="outline"
                        className="h-20 flex-col gap-2"
                        onClick={() => setShowFlashcards(true)}
                      >
                        <subject.icon className="h-6 w-6" />
                        <span>{subject.name} Cards</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Flashcard {currentFlashcard + 1} of {flashcards.length}</CardTitle>
                  <Progress value={(currentFlashcard / flashcards.length) * 100} />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div
                      className="relative w-full h-64 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={flipFlashcard}
                    >
                      <div className="text-center p-8">
                        <div className="text-sm text-muted-foreground mb-2">
                          {flashcardFlipped ? "Answer" : "Question"}
                        </div>
                        <div className="text-2xl font-bold">
                          {flashcardFlipped
                            ? flashcards[currentFlashcard].back
                            : flashcards[currentFlashcard].front
                          }
                        </div>
                        <div className="text-sm text-muted-foreground mt-4">
                          Click to {flashcardFlipped ? "see question" : "reveal answer"}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevFlashcard}
                        disabled={currentFlashcard === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextFlashcard}
                        disabled={currentFlashcard === flashcards.length - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
