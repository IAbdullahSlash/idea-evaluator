import { type NextRequest, NextResponse } from "next/server"

// Simple HTML sanitizer to prevent XSS
function escapeHtml(str: string | undefined): string {
  if (!str) return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export async function POST(request: NextRequest) {
  try {
    const { analysis, taskProgress, overallProgress } = await request.json()

    // Validate analysis exists
    if (!analysis) {
      return NextResponse.json({ error: "No analysis data provided" }, { status: 400 })
    }

    // Safely extract all properties with fallbacks
    const a = {
      projectTitle: analysis.projectTitle || "Project Analysis Report",
      projectDescription: analysis.projectDescription || "",
      feasibilityScore: analysis.feasibilityScore ?? 5,
      successProbability: analysis.successProbability ?? 50,
      difficultyLevel: analysis.difficultyLevel || "Intermediate",
      estimatedTimeframe: analysis.estimatedTimeframe || "TBD",
      detectedDomain: analysis.detectedDomain || "Not specified",
      honestAiFeedback: analysis.honestAiFeedback || "",
      keyStrengths: (analysis.keyStrengths || []) as string[],
      potentialChallenges: (analysis.potentialChallenges || []) as string[],
      techStack: {
        frontend: (analysis.techStack?.frontend || []) as string[],
        backend: (analysis.techStack?.backend || []) as string[],
        database: (analysis.techStack?.database || []) as string[],
        tools: (analysis.techStack?.tools || []) as string[],
      },
      roadmap: {
        phase1: analysis.roadmap?.phase1 || { title: "Phase 1", duration: "TBD", tasks: [] as string[] },
        phase2: analysis.roadmap?.phase2 || { title: "Phase 2", duration: "TBD", tasks: [] as string[] },
        phase3: analysis.roadmap?.phase3 || { title: "Phase 3", duration: "TBD", tasks: [] as string[] },
      },
      recommendations: (analysis.recommendations || []) as string[],
      similarProjects: (analysis.similarProjects || []) as string[],
    }

    const tp = taskProgress || {}
    const op = typeof overallProgress === "number" ? overallProgress : 0

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(a.projectTitle)} - Analysis Report</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .project-title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #000;
        }
        .project-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 20px;
        }
        .section {
            margin-bottom: 35px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #000;
            border-bottom: 2px solid #007acc;
            padding-bottom: 8px;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 25px;
        }
        .metric-card {
            text-align: center;
            padding: 20px;
            border: 2px solid #007acc;
            border-radius: 12px;
            background: #f8f9fa;
        }
        .metric-value {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #007acc;
        }
        .metric-label {
            font-size: 14px;
            color: #666;
            font-weight: 500;
        }
        .tech-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 25px;
        }
        .tech-category {
            margin-bottom: 20px;
        }
        .tech-category h4 {
            font-weight: bold;
            margin-bottom: 12px;
            font-size: 16px;
            color: #000;
        }
        .tech-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .tech-tag {
            background: #e3f2fd;
            border: 1px solid #007acc;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
        }
        .roadmap-phase {
            margin-bottom: 25px;
            padding: 20px;
            border-left: 5px solid #007acc;
            background: #f8f9fa;
            border-radius: 0 8px 8px 0;
        }
        .phase-title {
            font-weight: bold;
            margin-bottom: 15px;
            font-size: 18px;
            color: #007acc;
        }
        .task-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .task-item {
            margin-bottom: 8px;
            padding-left: 25px;
            position: relative;
            font-size: 14px;
        }
        .task-item:before {
            content: "▸";
            position: absolute;
            left: 0;
            color: #007acc;
            font-weight: bold;
        }
        .completed-task {
            text-decoration: line-through;
            color: #666;
        }
        .completed-task:before {
            content: "✓";
            color: #28a745;
        }
        .list-item {
            margin-bottom: 10px;
            padding-left: 25px;
            position: relative;
            font-size: 14px;
        }
        .list-item:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #007acc;
            font-weight: bold;
        }
        .progress-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #dee2e6;
        }
        .progress-bar {
            width: 100%;
            height: 24px;
            background: #e9ecef;
            border-radius: 12px;
            overflow: hidden;
            margin: 15px 0;
            border: 1px solid #dee2e6;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #007acc, #0056b3);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
        }
        .strengths-challenges {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 20px;
        }
        .strengths h4 {
            color: #28a745;
            margin-bottom: 15px;
        }
        .challenges h4 {
            color: #ffc107;
            margin-bottom: 15px;
        }
        .footer {
            margin-top: 50px;
            padding-top: 25px;
            border-top: 2px solid #dee2e6;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .badge-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .badge-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .badge-danger { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="header">
        <div class="project-title">${escapeHtml(a.projectTitle)}</div>
        <div class="project-subtitle">${escapeHtml(a.projectDescription)}</div>
        <div class="badge ${a.feasibilityScore >= 8 ? "badge-success" : a.feasibilityScore >= 6 ? "badge-warning" : "badge-danger"}">
            ${a.feasibilityScore >= 8 ? "Highly Feasible" : a.feasibilityScore >= 6 ? "Feasible" : "Challenging"}
        </div>
        <p><strong>Domain:</strong> ${escapeHtml(a.detectedDomain)}</p>
        <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}</p>
    </div>

    <div class="section">
        <h2 class="section-title">📊 Project Progress Overview</h2>
        <div class="progress-section">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${op}%">
                    ${Math.round(op)}%
                </div>
            </div>
            <p><strong>Overall Progress:</strong> ${Math.round(op)}% completed</p>
            <p><strong>Estimated Timeline:</strong> ${escapeHtml(a.estimatedTimeframe)}</p>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">🎯 Feasibility Analysis</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${a.feasibilityScore}/10</div>
                <div class="metric-label">Feasibility Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${a.successProbability}%</div>
                <div class="metric-label">Success Probability</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${escapeHtml(a.difficultyLevel)}</div>
                <div class="metric-label">Difficulty Level</div>
            </div>
        </div>

        <div class="strengths-challenges">
            <div class="strengths">
                <h4>✅ Key Strengths</h4>
                <ul style="list-style: none; padding: 0;">
                    ${a.keyStrengths.map((strength: string) => `<li class="list-item">${escapeHtml(strength)}</li>`).join("")}
                </ul>
            </div>
            <div class="challenges">
                <h4>⚠️ Potential Challenges</h4>
                <ul style="list-style: none; padding: 0;">
                    ${a.potentialChallenges.map((challenge: string) => `<li class="list-item">${escapeHtml(challenge)}</li>`).join("")}
                </ul>
            </div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">💻 Recommended Tech Stack</h2>
        <div class="tech-grid">
            <div class="tech-category">
                <h4>Frontend Technologies</h4>
                <div class="tech-tags">
                    ${a.techStack.frontend.map((tech: string) => `<span class="tech-tag">${escapeHtml(tech)}</span>`).join("")}
                </div>
            </div>
            <div class="tech-category">
                <h4>Backend Technologies</h4>
                <div class="tech-tags">
                    ${a.techStack.backend.map((tech: string) => `<span class="tech-tag">${escapeHtml(tech)}</span>`).join("")}
                </div>
            </div>
            <div class="tech-category">
                <h4>Database Solutions</h4>
                <div class="tech-tags">
                    ${a.techStack.database.map((tech: string) => `<span class="tech-tag">${escapeHtml(tech)}</span>`).join("")}
                </div>
            </div>
            <div class="tech-category">
                <h4>Tools & Services</h4>
                <div class="tech-tags">
                    ${a.techStack.tools.map((tool: string) => `<span class="tech-tag">${escapeHtml(tool)}</span>`).join("")}
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">🗺️ Development Roadmap</h2>

        <div class="roadmap-phase">
            <div class="phase-title">Phase 1: ${escapeHtml(a.roadmap.phase1.title)} (${escapeHtml(a.roadmap.phase1.duration)})</div>
            <ul class="task-list">
                ${a.roadmap.phase1.tasks
                  .map(
                    (task: string, index: number) =>
                      `<li class="task-item ${tp[`phase1-${index}`] ? "completed-task" : ""}">${escapeHtml(task)}</li>`,
                  )
                  .join("")}
            </ul>
        </div>

        <div class="roadmap-phase">
            <div class="phase-title">Phase 2: ${escapeHtml(a.roadmap.phase2.title)} (${escapeHtml(a.roadmap.phase2.duration)})</div>
            <ul class="task-list">
                ${a.roadmap.phase2.tasks
                  .map(
                    (task: string, index: number) =>
                      `<li class="task-item ${tp[`phase2-${index}`] ? "completed-task" : ""}">${escapeHtml(task)}</li>`,
                  )
                  .join("")}
            </ul>
        </div>

        <div class="roadmap-phase">
            <div class="phase-title">Phase 3: ${escapeHtml(a.roadmap.phase3.title)} (${escapeHtml(a.roadmap.phase3.duration)})</div>
            <ul class="task-list">
                ${a.roadmap.phase3.tasks
                  .map(
                    (task: string, index: number) =>
                      `<li class="task-item ${tp[`phase3-${index}`] ? "completed-task" : ""}">${escapeHtml(task)}</li>`,
                  )
                  .join("")}
            </ul>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">💡 AI Recommendations</h2>
        <ul style="list-style: none; padding: 0;">
            ${a.recommendations.map((rec: string) => `<li class="list-item">${escapeHtml(rec)}</li>`).join("")}
        </ul>
    </div>

    ${
      a.similarProjects.length > 0
        ? `
    <div class="section">
        <h2 class="section-title">🔗 Similar Projects for Reference</h2>
        <div class="tech-tags">
            ${a.similarProjects.map((project: string) => `<span class="tech-tag">${escapeHtml(project)}</span>`).join("")}
        </div>
    </div>
    `
        : ""
    }

    <div class="footer">
        <p><strong>The Idea Evaluator</strong> - AI-Powered Project Analysis Tool</p>
        <p>This comprehensive analysis was generated using advanced AI to help validate and refine your project idea.</p>
        <p>Report generated on ${new Date().toLocaleString()}</p>
    </div>

    <script>
        // Auto-trigger print dialog for PDF generation
        window.onload = function() {
            setTimeout(() => {
                window.print();
            }, 1000);
        }
    </script>
</body>
</html>
    `

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return NextResponse.json({ error: "Failed to generate PDF export" }, { status: 500 })
  }
}
