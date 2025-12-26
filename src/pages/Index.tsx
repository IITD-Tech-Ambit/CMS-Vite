import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { BookOpen, PenTool, Shield, Clock, ArrowRight, Loader2 } from 'lucide-react';

export default function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      const redirectPath = role === 'admin' ? '/dashboard/admin' : '/dashboard/user';
      navigate(redirectPath, { replace: true });
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-24 md:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="animate-fade-in font-display text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
              Publish IIT Delhi Research and Insights
              <span className="text-primary">IITD Research Magazine</span>
            </h1>
            <p className="mt-6 animate-fade-in text-lg text-muted-foreground md:text-xl" style={{ animationDelay: '100ms' }}>
              The official platform for IIT Delhi research — submit articles, reports, and technical
              insights with a powerful markdown editor and real-time preview.
            </p>
            <div className="mt-8 flex animate-fade-in flex-col items-center justify-center gap-4 sm:flex-row" style={{ animationDelay: '200ms' }}>
              <Button size="xl" variant="hero" asChild>
                <Link to="/auth?mode=signup">
                  Submit Research
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-foreground">
              Everything You Need to Share Research
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tools for researchers, authors, and reviewers at IIT Delhi
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="animate-slide-up rounded-2xl border border-border/50 bg-card p-8 shadow-card transition-shadow hover:shadow-card-hover" style={{ animationDelay: '0ms' }}>
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                <PenTool className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold">Markdown Editor</h3>
              <p className="mt-2 text-muted-foreground">
                Write with a powerful markdown editor featuring live preview, toolbar shortcuts, and syntax highlighting.
              </p>
            </div>

            <div className="animate-slide-up rounded-2xl border border-border/50 bg-card p-8 shadow-card transition-shadow hover:shadow-card-hover" style={{ animationDelay: '100ms' }}>
              <div className="mb-4 inline-flex rounded-xl bg-success/10 p-3">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-display text-xl font-semibold">Admin Approval</h3>
              <p className="mt-2 text-muted-foreground">
                Built-in workflow for content review with approval and rejection capabilities for quality control.
              </p>
            </div>

            <div className="animate-slide-up rounded-2xl border border-border/50 bg-card p-8 shadow-card transition-shadow hover:shadow-card-hover" style={{ animationDelay: '200ms' }}>
              <div className="mb-4 inline-flex rounded-xl bg-warning/10 p-3">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <h3 className="font-display text-xl font-semibold">Read Time Estimation</h3>
              <p className="mt-2 text-muted-foreground">
                Automatic calculation of reading time based on content length to help readers plan their time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-foreground">
              Explore IITD Research Magazine
            </h2>
            <p className="mt-4 text-muted-foreground">
              Discover research, technical reports, and articles from IIT Delhi
            </p>
            <Button size="xl" variant="hero" className="mt-8" asChild>
              <Link to="/auth?mode=signup">
                Create Your Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 sm:py-8">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="font-display text-sm sm:text-base font-semibold">IITD Research Magazine</span>
            </div>
            <p className="text-xs sm:text-sm text-center text-muted-foreground">
              © {new Date().getFullYear()} Indian Institute of Technology Delhi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
