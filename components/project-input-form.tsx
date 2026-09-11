"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles } from "lucide-react"

interface ProjectFormData {
  title: string
  description: string
  domain: string
  projectType: string
  timeline: string
  experience: string
}

export function ProjectInputForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<ProjectFormData>({
    title: "",
    description: "",
    domain: "",
    projectType: "",
    timeline: "",
    experience: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea: `${formData.title}: ${formData.description}`,
          stage: 'stage1',
          experience: formData.experience,
          timeline: formData.timeline,
          domain: formData.domain,
          projectType: formData.projectType,
        }),
      })

      if (!response.ok) {
        throw new Error("Analysis failed")
      }

      const analysis = await response.json()

      // Store analysis results in localStorage for the analysis page
      localStorage.setItem(
        "projectAnalysis",
        JSON.stringify({
          ...analysis,
          projectTitle: formData.title,
          projectDescription: formData.description,
          projectDomain: formData.domain,
          projectType: formData.projectType,
        }),
      )

      // Redirect to analysis page
      router.push("/analysis")
    } catch (error) {
      console.error("Analysis error:", error)
      alert("Failed to analyze project. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const domains = [
    "Web Development",
    "Mobile App Development",
    "Machine Learning/AI",
    "Data Science",
    "Game Development",
    "Blockchain/Crypto",
    "IoT/Hardware",
    "Cybersecurity",
    "DevOps/Cloud",
    "Desktop Applications",
    "Other",
  ]

  const projectTypes = [
    "Minor Project",
    "Major Project",
    "Hackathon",
    "Personal Project",
    "Startup Idea",
    "Research Project",
    "Open Source Contribution",
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Project Title *
        </Label>
        <Input
          id="title"
          placeholder="e.g., Smart Campus Navigation App"
          value={formData.title}
          onChange={(e) => handleInputChange("title", e.target.value)}
          required
          className="w-full"
        />
      </div>

      {/* Project Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Project Description *
        </Label>
        <Textarea
          id="description"
          placeholder="Describe your project idea, key features, target users, and what problem it solves..."
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          required
          rows={4}
          className="w-full resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Be specific about features, target audience, and the problem you're solving
        </p>
      </div>

      {/* Domain and Project Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="domain" className="text-sm font-medium">
            Domain *
          </Label>
          <Select value={formData.domain} onValueChange={(value) => handleInputChange("domain", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent>
              {domains.map((domain) => (
                <SelectItem key={domain} value={domain}>
                  {domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectType" className="text-sm font-medium">
            Project Type *
          </Label>
          <Select value={formData.projectType} onValueChange={(value) => handleInputChange("projectType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {projectTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline and Experience */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="timeline" className="text-sm font-medium">
            Expected Timeline
          </Label>
          <Select value={formData.timeline} onValueChange={(value) => handleInputChange("timeline", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select timeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
              <SelectItem value="1 month">1 month</SelectItem>
              <SelectItem value="2-3 months">2-3 months</SelectItem>
              <SelectItem value="6 months">6 months</SelectItem>
              <SelectItem value="1 year+">1 year+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience" className="text-sm font-medium">
            Your Experience Level
          </Label>
          <Select value={formData.experience} onValueChange={(value) => handleInputChange("experience", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
              <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
              <SelectItem value="advanced">Advanced (3+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Additional Context */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Pro Tips for Better Analysis</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-default">
                  Include target users
                </Badge>
                <Badge variant="outline" className="text-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-default">
                  Mention key features
                </Badge>
                <Badge variant="outline" className="text-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-default">
                  Specify tech preferences
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Note any constraints
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-12 text-base font-medium"
        disabled={isLoading || !formData.title || !formData.description || !formData.domain || !formData.projectType}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing Your Project...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Get AI Analysis
          </>
        )}
      </Button>
    </form>
  )
}
