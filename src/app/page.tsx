"use client";

import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { differenceInYears, isFuture, isValid } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlayNiteLogo } from "@/components/playnite-logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

const currentYear = new Date().getFullYear();

const ageSchema = z.object({
    day: z.coerce.number().min(1, "Day is required."),
    month: z.coerce.number().min(1, "Month is required."),
    year: z.coerce.number().min(1900, "Year is required."),
  })
  .refine(
    (data) => {
      const date = new Date(data.year, data.month - 1, data.day);
      return (
        isValid(date) &&
        date.getFullYear() === data.year &&
        date.getMonth() === data.month - 1 &&
        date.getDate() === data.day
      );
    },
    {
      message: "Please enter a valid date.",
      path: ["day"],
    }
  )
  .refine(
    (data) => !isFuture(new Date(data.year, data.month - 1, data.day)),
    {
      message: "Your birthday can't be in the future.",
      path: ["year"],
    }
  );

type AgeFormValues = z.infer<typeof ageSchema>;

export default function AgeVerificationPage() {
  const router = useRouter();
  const form = useForm<AgeFormValues>({
    resolver: zodResolver(ageSchema),
    defaultValues: {},
  });

  const onSubmit: SubmitHandler<AgeFormValues> = (data) => {
    const birthDate = new Date(data.year, data.month - 1, data.day);
    const age = differenceInYears(new Date(), birthDate);

    if (age >= 18) {
      router.push("/gender");
    } else {
      router.push("/study");
    }
  };

  const years = Array.from(
    { length: currentYear - 1900 + 1 },
    (_, i) => currentYear - i
  );
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-fit">
            <PlayNiteLogo />
          </div>
          <CardTitle className="font-headline text-3xl">
            Verify Your Age
          </CardTitle>
          <CardDescription>
            Please enter your date of birth to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {months.map((m) => (
                            <SelectItem key={m.value} value={m.value.toString()}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {days.map((d) => (
                            <SelectItem key={d} value={d.toString()}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={y.toString()}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <FormMessage>
                {form.formState.errors.day?.message ||
                  form.formState.errors.month?.message ||
                  form.formState.errors.year?.message}
              </FormMessage>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                Enter
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>By entering this site you are agreeing to our Terms of Service and Privacy Policy.</p>
        <p>Already have an account? <Link href="/login" className="text-primary hover:underline">Log In</Link></p>
      </div>
    </main>
  );
}
