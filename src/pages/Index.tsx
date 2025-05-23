import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <img src="/lovable-uploads/b20f2556-f276-4aea-993b-aead6d9fafd8.png" alt="Tiro Logo" className="h-8" />
          </div>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-sm font-medium">
              Home
            </Link>
            <Link to="#features" className="text-sm font-medium">
              Features
            </Link>
            <Link to="#how-it-works" className="text-sm font-medium">
              How it Works
            </Link>
            {user ? (
              <Button
                asChild
                variant="default"
                className="bg-tiro-primary hover:bg-tiro-primary/90"
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button
                  asChild
                  className="bg-tiro-primary hover:bg-tiro-primary/90"
                >
                  <Link to="/register">Sign up</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-tiro-primary/5 to-tiro-secondary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-10 lg:mb-0">
              <h1 className="text-5xl font-bold mb-6">
                Connecting{" "}
                <span className="bg-gradient-to-r from-tiro-primary to-tiro-secondary bg-clip-text text-transparent">
                  Entrepreneurs
                </span>{" "}
                and{" "}
                <span className="bg-gradient-to-r from-tiro-primary to-tiro-secondary bg-clip-text text-transparent">
                  Students
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-md">
                Tiro bridges the gap between entrepreneurs with web design needs 
                and talented students looking to build their portfolio.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-tiro-primary hover:bg-tiro-primary/90"
                >
                  <Link to="/register">Get Started</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                >
                  <Link to="#how-it-works">Learn More</Link>
                </Button>
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="relative">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-tiro-primary/10 rounded-full filter blur-xl"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-tiro-secondary/10 rounded-full filter blur-xl"></div>
                <div className="relative bg-white p-6 rounded-xl shadow-xl border">
                  <div className="p-4 border rounded-lg mb-4 bg-gray-50">
                    <h3 className="font-medium">Project: E-commerce Redesign</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Looking for a talented web designer to revamp our online store.
                    </p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        OPEN
                      </span>
                      <Button size="sm" variant="ghost" className="text-xs">
                        View Details
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg mb-2 bg-tiro-primary/5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-tiro-primary flex items-center justify-center text-white text-sm">
                        S
                      </div>
                      <div>
                        <p className="text-sm">
                          I'd love to work on this project! I have experience with e-commerce design and can help improve your conversion rate.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Marie Dubois, Student
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Platform Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform provides all the tools you need to collaborate efficiently 
              and deliver successful web design projects.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="border rounded-xl p-6 bg-white shadow-sm">
              <div className="w-12 h-12 bg-tiro-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tiro-primary">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Project Showcase</h3>
              <p className="text-muted-foreground">
                Entrepreneurs can post their projects, while students can browse and apply to ones that match their skills.
              </p>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm">
              <div className="w-12 h-12 bg-tiro-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tiro-primary">
                  <path d="m3 8 4-4 4 4"></path>
                  <path d="M7 4v16"></path>
                  <path d="m21 16-4 4-4-4"></path>
                  <path d="M17 20V4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Task Management</h3>
              <p className="text-muted-foreground">
                Break down projects into manageable tasks, assign responsibilities, and track progress easily.
              </p>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm">
              <div className="w-12 h-12 bg-tiro-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tiro-primary">
                  <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"></path>
                  <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Direct Messaging</h3>
              <p className="text-muted-foreground">
                Communicate efficiently with in-app messaging to discuss project details and share feedback.
              </p>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Document Sharing</h3>
              <p className="text-muted-foreground">
                Share designs, wireframes, and other project files securely on the platform.
              </p>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                  <path d="m9 12 2 2 4-4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Secure Platform</h3>
              <p className="text-muted-foreground">
                Your projects and communications are protected with industry-standard security measures.
              </p>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm">
              <div className="w-12 h-12 bg-tiro-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tiro-primary">
                  <path d="M12 2v20"></path>
                  <path d="m17 5-5-3-5 3"></path>
                  <path d="m17 19-5 3-5-3"></path>
                  <path d="M2 12h20"></path>
                  <path d="m5 7-3 5 3 5"></path>
                  <path d="m19 7 3 5-3 5"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Portfolio Building</h3>
              <p className="text-muted-foreground">
                Students can showcase their completed projects and build a professional portfolio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tiro makes it easy to connect entrepreneurs with talented student web designers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="space-y-12">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-tiro-primary text-white rounded-full flex items-center justify-center font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-medium mb-2">Create an Account</h3>
                    <p className="text-muted-foreground">
                      Sign up as either an entrepreneur looking for web design services or as a student offering your skills.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-tiro-primary text-white rounded-full flex items-center justify-center font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-medium mb-2">Post or Browse Projects</h3>
                    <p className="text-muted-foreground">
                      Entrepreneurs post project details and requirements. Students browse and apply to projects that match their skills.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-tiro-primary text-white rounded-full flex items-center justify-center font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-medium mb-2">Collaborate & Create</h3>
                    <p className="text-muted-foreground">
                      Work together using our project management tools, messaging, and file sharing to bring designs to life.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-tiro-primary text-white rounded-full flex items-center justify-center font-bold shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-medium mb-2">Complete & Showcase</h3>
                    <p className="text-muted-foreground">
                      Finalize projects and add them to your portfolio. Entrepreneurs get their design needs met, and students build experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-tiro-primary/5 rounded-full filter blur-3xl"></div>
              <div className="border p-6 bg-white rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                  <h3 className="font-medium">Create New Project</h3>
                  <div className="w-8 h-8 rounded-full bg-tiro-primary flex items-center justify-center text-white text-sm">
                    E
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Project Title</label>
                    <div className="h-10 bg-gray-100 rounded w-full"></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <div className="h-32 bg-gray-100 rounded w-full"></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Skills Required</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-tiro-primary/10 text-tiro-primary text-xs rounded">UI Design</span>
                      <span className="px-2 py-1 bg-tiro-primary/10 text-tiro-primary text-xs rounded">HTML/CSS</span>
                      <span className="px-2 py-1 bg-tiro-primary/10 text-tiro-primary text-xs rounded">Responsive</span>
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className="bg-tiro-primary text-white text-center py-2 rounded cursor-pointer">
                      Publish Project
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-gradient-to-r from-tiro-primary to-tiro-secondary rounded-2xl p-10 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Connect?</h2>
            <p className="text-lg mb-8 max-w-lg mx-auto">
              Join Tiro today to connect with talented students or find exciting web design projects.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-white text-tiro-primary border-none"
              >
                <Link to="/register">Sign Up Now</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white/10"
              >
                <Link to="/login">Log In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-10 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold text-tiro-primary mb-4">Tiro</h3>
              <p className="text-muted-foreground">
                Connecting entrepreneurs with talented student web designers
                to create impactful digital experiences.
              </p>
            </div>
            <div>
              <h3 className="text-md font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/" className="text-muted-foreground hover:text-tiro-primary">Home</Link></li>
                <li><Link to="#features" className="text-muted-foreground hover:text-tiro-primary">Features</Link></li>
                <li><Link to="#how-it-works" className="text-muted-foreground hover:text-tiro-primary">How It Works</Link></li>
                <li><Link to="/login" className="text-muted-foreground hover:text-tiro-primary">Log In</Link></li>
                <li><Link to="/register" className="text-muted-foreground hover:text-tiro-primary">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-md font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>info@tiro-connect.com</li>
                <li>+33 123 456 789</li>
                <li>Paris, France</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Tiro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
