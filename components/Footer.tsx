import { Brain, Github, Twitter, Linkedin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        {/* Brand */}
        <div className="text-center space-y-4 mb-8">
          <a href="/" className="flex items-center justify-center space-x-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">The Idea Evaluator</span>
          </a>

        </div>

        <div className="text-center text-sm text-muted-foreground">
          <div className="space-y-4">
            <p className="font-semibold">Made By:</p>
            <div className="flex justify-center items-center space-x-3">
              <span className="text-muted-foreground">Abdullah</span>
              <a 
                href="https://twitter.com/contributor1" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[rgb(var(--twitter))] transition-colors"
                aria-label="Abdullah Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a 
                href="https://github.com/IAbdullahSlash" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Abdullah GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a 
                href="https://www.linkedin.com/in/abdullah-azmi-492120359/" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[rgb(var(--linkedin))] transition-colors"
                aria-label="Abdullah LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
            <div className="flex justify-center items-center space-x-3">
              <span className="text-muted-foreground">Darakhshan</span>
              <a 
                href="https://twitter.com/contributor2" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[rgb(var(--twitter))] transition-colors"
                aria-label="Darakhshan Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a 
                href="https://github.com/Darakhshan-dev" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Darakhshan GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a 
                href="https://www.linkedin.com/in/darakhshan-ifraque-6287a1320/" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[rgb(var(--linkedin))] transition-colors"
                aria-label="Darakhshan LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}