
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Checkbox } from "@/components/ui/checkbox";

// Define a simple spinner component to replace the Icons import
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Define a ChevronLeft icon component
const ChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left h-4 w-4">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isEntrepreneur, setIsEntrepreneur] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!name || !email || !password) {
        toast({
          title: "Missing Fields",
          description: "Please fill in all fields.",
          variant: "destructive",
        });
        return;
      }

      const role = isEntrepreneur ? "entrepreneur" : "student";
      await register(email, password, name, role);
      toast({
        title: "Success",
        description: "Registration successful!",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container relative hidden h-[calc(100vh-80px)] flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link
        to="/login"
        className="absolute left-4 top-4 md:left-8 md:top-8 text-tiro-purple"
      >
        <Button variant="ghost">
          <ChevronLeft />
          Back
        </Button>
      </Link>
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-zinc-900/80" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          Tiro
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Unlock your potential and bring your ideas to life with
              Tiro.&rdquo;
            </p>
            <footer className="text-sm">Tiro Team</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <CardHeader className="space-y-0">
              <CardTitle className="text-2xl font-bold">
                Create an account
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter your email below to create your account
              </p>
            </CardHeader>
          </div>
          <Card className="border-none">
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="entrepreneur"
                  checked={isEntrepreneur}
                  onCheckedChange={(checked) => setIsEntrepreneur(checked === true)}
                />
                <Label
                  htmlFor="entrepreneur"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I'm an entrepreneur
                </Label>
              </div>
            </CardContent>
          </Card>
          <Button disabled={isLoading} onClick={handleSubmit}>
            {isLoading && <Spinner />}
            Create Account
          </Button>
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking create account, you agree to our{" "}
            <Link
              to="/terms"
              className="underline underline-offset-4 hover:text-tiro-purple"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="underline underline-offset-4 hover:text-tiro-purple"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
