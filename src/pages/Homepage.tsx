import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Zap, Palette, RotateCcw, Brain, Sparkles, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import heroMainBg from '@/assets/hero-main-bg.jpg';

const Homepage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageCircle,
      title: "Say Goodbye to Complexity",
      description: "Pure conversational operation - no more tedious masking or complex tools. Just describe what you want and get it instantly."
    },
    {
      icon: Zap,
      title: "Lightning-Fast Speed",
      description: "Average generation time of just 3-10 seconds per image. Time is money - boost your productivity with our ultra-fast service."
    },
    {
      icon: Palette,
      title: "Unlimited Scene Customization",
      description: "Highly customizable backgrounds with people, objects, or entirely new scenes. Your creativity, our implementation."
    },
    {
      icon: RotateCcw,
      title: "Flexible Perspectives",
      description: "Multiple angle options and multi-product combinations. Create stunning product sets with chairs, tables, and more together."
    },
    {
      icon: Brain,
      title: "Proprietary AI Model",
      description: "Industry-leading exclusive AI model available nowhere else. Superior understanding and precision for unmatched quality."
    },
    {
      icon: Sparkles,
      title: "Natural & Realistic",
      description: "Exceptional detail and natural results. Professional photography quality that enhances your brand image."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${heroMainBg})`
        }}
      >
        <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            AI Image Generation
            <span className="block text-primary">
              Made Simple
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            Create stunning product images with pure conversation. No complex tools, no waiting - just describe what you want.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-4"
              onClick={() => navigate('/auth')}
            >
              Start Creating Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-4"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of image generation with our cutting-edge technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border-border p-8 hover:shadow-sm transition-all duration-300 hover:scale-105">
                <feature.icon className="h-12 w-12 text-primary mb-6" />
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Speed Section */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
            3-10 Seconds Per Image
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Lightning-fast generation means higher productivity. Stop waiting, start creating.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">3s</div>
              <div className="text-muted-foreground">Minimum Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">10s</div>
              <div className="text-muted-foreground">Maximum Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">6x</div>
              <div className="text-muted-foreground">Faster Than Competition</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
            Ready to Transform Your Images?
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Join thousands of creators who have revolutionized their workflow with our AI-powered image generation
          </p>
          
          <Button 
            size="lg" 
            className="text-xl px-12 py-6"
            onClick={() => navigate('/auth')}
          >
            Start Your Journey Now
            <ArrowRight className="ml-3 h-6 w-6" />
          </Button>
          
          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • Free trial included • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-secondary/10 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">
            © 2024 AI Image Generator. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;