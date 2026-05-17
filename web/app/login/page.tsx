"use client";

import type { Metadata } from "next";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/auth";

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/token/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: values.email, password: values.password }),
          credentials: "include",
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(body.detail ?? "Invalid email or password.");
        return;
      }
      // Store access token in memory via a cookie the middleware can read.
      // Full auth wiring happens in Phase 1 RBAC work.
      document.cookie = "auth_token=placeholder; path=/; SameSite=Lax";
      window.location.href = "/dashboard";
    } catch {
      setServerError("Unable to reach the server. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            {process.env.NEXT_PUBLIC_APP_NAME ?? "Church Management System"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-4">
            {serverError && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </p>
            )}

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="pastor@example.com"
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
            <a
              href="/reset-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
