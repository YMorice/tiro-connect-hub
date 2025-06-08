
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address")
});

type FormValues = z.infer<typeof formSchema>;

const ResetPassword = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      console.log("Sending password reset email to:", values.email);
      
      // Use the correct redirect URL for password reset
      const redirectUrl = `${window.location.origin}/update-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        console.error("Reset password error:", error);
        toast.error(error.message || "Failed to send reset email");
      } else {
        console.log("Reset email sent successfully");
        setEmailSent(true);
        toast.success("Password reset email sent!");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Failed to send reset email");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <img src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" alt="Tiro Logo" className="h-10" />
              </div>
              <CardDescription>
                Check your email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We've sent a password reset link to <strong className="text-foreground">{form.getValues("email")}</strong>
                </p>
                <p>
                  Please click the link in the email to reset your password.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                  <p className="text-amber-800">
                    <strong>Important:</strong> The email may take a few minutes to arrive. 
                    Don't forget to check your spam folder if you don't see it in your inbox.
                    Also, make sure the Site URL and Redirect URLs are properly configured in your Supabase settings.
                  </p>
                </div>
              </div>
              
              <Button 
                asChild
                className="w-full bg-tiro-primary hover:bg-tiro-primary/90 text-white"
              >
                <Link to="/login">
                  Back to Login
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" alt="Tiro Logo" className="h-10" />
            </div>
            <CardDescription>
              Reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField 
                  control={form.control} 
                  name="email" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your email address" 
                          {...field} 
                          autoComplete="email" 
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                
                <Button 
                  type="submit" 
                  className="w-full bg-tiro-primary hover:bg-tiro-primary/90 text-white" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  asChild
                >
                  <Link to="/login" className="flex items-center justify-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
