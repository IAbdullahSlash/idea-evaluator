import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { analysis, taskProgress, overallProgress } = await request.json()

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${analysis.projectTitle || "Project"} - Analysis Report</title>
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
        <div class="project-title">${analysis.projectTitle || "Project Analysis Report"}</div>
        <div class="project-subtitle">${analysis.projectDescription || "AI-powered project analysis"}</div>
        <div class="badge ${analysis.feasibilityScore >= 8 ? "badge-success" : analysis.feasibilityScore >= 6 ? "badge-warning" : "badge-danger"}">
            ${analysis.feasibilityScore >= 8 ? "Highly Feasible" : analysis.feasibilityScore >= 6 ? "Feasible" : "Challenging"}
        </div>
        <p><strong>Domain:</strong> ${analysis.projectDomain || "Not specified"}</p>
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
                <div class="progress-fill" style="width: ${overallProgress}%">
                    ${Math.round(overallProgress)}%
                </div>
            </div>
            <p><strong>Overall Progress:</strong> ${Math.round(overallProgress)}% completed</p>
            <p><strong>Estimated Timeline:</strong> ${analysis.estimatedTimeframe}</p>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">🎯 Feasibility Analysis</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${analysis.feasibilityScore}/10</div>
                <div class="metric-label">Feasibility Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${analysis.successProbability}%</div>
                <div class="metric-label">Success Probability</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${analysis.difficultyLevel}</div>
                <div class="metric-label">Difficulty Level</div>
            </div>
        </div>

        <div class="strengths-challenges">
            <div class="strengths">
                <h4>✅ Key Strengths</h4>
                <ul style="list-style: none; padding: 0;">
                    ${analysis.keyStrengths.map((strength: string) => `<li class="list-item">${strength}</li>`).join("")}
                </ul>
            </div>
            <div class="challenges">
                <h4>⚠️ Potential Challenges</h4>
                <ul style="list-style: none; padding: 0;">
                    ${analysis.potentialChallenges.map((challenge: string) => `<li class="list-item">${challenge}</li>`).join("")}
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
                    ${analysis.techStack.frontend.map((tech: string) => `<span class="tech-tag">${tech}</span>`).join("")}
                </div>
            </div>
            <div class="tech-category">
                <h4>Backend Technologies</h4>
                <div class="tech-tags">
                    ${analysis.techStack.backend.map((tech: string) => `<span class="tech-tag">${tech}</span>`).join("")}
                </div>
            </div>
            <div class="tech-category">
                <h4>Database Solutions</h4>
                <div class="tech-tags">
                    ${analysis.techStack.database.map((tech: string) => `<span class="tech-tag">${tech}</span>`).join("")}
                </div>
            </div>
            <div class="tech-category">
                <h4>Tools & Services</h4>
                <div class="tech-tags">
                    ${analysis.techStack.tools.map((tool: string) => `<span class="tech-tag">${tool}</span>`).join("")}
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">🗺️ Development Roadmap</h2>
        
        <div class="roadmap-phase">
            <div class="phase-title">Phase 1: ${analysis.roadmap.phase1.title} (${analysis.roadmap.phase1.duration})</div>
            <ul class="task-list">
                ${analysis.roadmap.phase1.tasks
                  .map(
                    (task: string, index: number) =>
                      `<li class="task-item ${taskProgress[`phase1-${index}`] ? "completed-task" : ""}">${task}</li>`,
                  )
                  .join("")}
            </ul>
        </div>

        <div class="roadmap-phase">
            <div class="phase-title">Phase 2: ${analysis.roadmap.phase2.title} (${analysis.roadmap.phase2.duration})</div>
            <ul class="task-list">
                ${analysis.roadmap.phase2.tasks
                  .map(
                    (task: string, index: number) =>
                      `<li class="task-item ${taskProgress[`phase2-${index}`] ? "completed-task" : ""}">${task}</li>`,
                  )
                  .join("")}
            </ul>
        </div>

        <div class="roadmap-phase">
            <div class="phase-title">Phase 3: ${analysis.roadmap.phase3.title} (${analysis.roadmap.phase3.duration})</div>
            <ul class="task-list">
                ${analysis.roadmap.phase3.tasks
                  .map(
                    (task: string, index: number) =>
                      `<li class="task-item ${taskProgress[`phase3-${index}`] ? "completed-task" : ""}">${task}</li>`,
                  )
                  .join("")}
            </ul>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">💡 AI Recommendations</h2>
        <ul style="list-style: none; padding: 0;">
            ${analysis.recommendations.map((rec: string) => `<li class="list-item">${rec}</li>`).join("")}
        </ul>
    </div>

    ${
      analysis.similarProjects.length > 0
        ? `
    <div class="section">
        <h2 class="section-title">🔗 Similar Projects for Reference</h2>
        <div class="tech-tags">
            ${analysis.similarProjects.map((project: string) => `<span class="tech-tag">${project}</span>`).join("")}
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
