import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";

const AgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  generationPrompt: z.string().min(10),
  evaluationPrompt: z.string().min(10),
  evaluationDims: z.array(z.string()).default(["relevance", "accuracy", "actionability", "clarity"]),
  fileTypeFilters: z.array(z.string()).default([]),
  severityThreshold: z.number().int().min(1).max(5).default(1),
  enabled: z.boolean().default(true),
});

const PRESET_AGENTS = [
  {
    name: "General Code Reviewer",
    description: "A comprehensive code reviewer that checks for best practices, potential bugs, and code quality across all file types.",
    generationPrompt: "You are an expert code reviewer. Analyze the code changes and provide constructive feedback on:\n- Code quality and maintainability\n- Potential bugs or edge cases\n- Performance considerations\n- Security vulnerabilities\n- Best practices and patterns\n\nBe specific, cite line numbers, and suggest improvements. Focus on high-impact issues.",
    evaluationPrompt: "Evaluate this code review comment on the following dimensions:\n- Relevance: How relevant is the comment to the code change?\n- Accuracy: Is the feedback technically accurate?\n- Actionability: Can the developer take clear action based on this?\n- Clarity: Is the feedback easy to understand?\n\nRate each dimension from 1-10.",
    evaluationDims: ["relevance", "accuracy", "actionability", "clarity"],
    fileTypeFilters: [],
    severityThreshold: 1,
    enabled: true,
  },
  {
    name: "Security Auditor",
    description: "Specialized agent focused on identifying security vulnerabilities, authentication issues, and potential exploits.",
    generationPrompt: "You are a security expert specializing in code security audits. Review the code changes for:\n- SQL injection vulnerabilities\n- XSS (Cross-Site Scripting) risks\n- Authentication and authorization flaws\n- Sensitive data exposure\n- Insecure dependencies\n- CSRF vulnerabilities\n- Input validation issues\n\nFlag critical security issues with high severity. Provide remediation steps.",
    evaluationPrompt: "Evaluate this security review comment:\n- Relevance: Is this a real security concern?\n- Severity: How critical is this vulnerability?\n- Accuracy: Is the security assessment correct?\n- Actionability: Are clear security fixes provided?\n\nRate each dimension from 1-10.",
    evaluationDims: ["relevance", "severity", "accuracy", "actionability"],
    fileTypeFilters: [],
    severityThreshold: 1,
    enabled: true,
  },
  {
    name: "Performance Optimizer",
    description: "Focuses on performance bottlenecks, optimization opportunities, and resource efficiency.",
    generationPrompt: "You are a performance optimization expert. Analyze the code for:\n- Algorithm efficiency and Big O complexity\n- Database query optimization\n- Memory leaks and resource management\n- Unnecessary computations or loops\n- Caching opportunities\n- Network request optimization\n- Bundle size and lazy loading opportunities\n\nProvide specific optimization suggestions with measurable impact.",
    evaluationPrompt: "Evaluate this performance review comment:\n- Relevance: Is this a real performance concern?\n- Impact: How much performance improvement could this provide?\n- Accuracy: Is the performance analysis correct?\n- Feasibility: Is the suggested optimization practical?\n\nRate each dimension from 1-10.",
    evaluationDims: ["relevance", "impact", "accuracy", "feasibility"],
    fileTypeFilters: [],
    severityThreshold: 1,
    enabled: true,
  },
];

async function seedPresetAgents(userId: string) {
  const agents = await Promise.all(
    PRESET_AGENTS.map((agentData) =>
      prisma.agent.create({
        data: {
          ...agentData,
          userId,
        },
      })
    )
  );
  return agents;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    let agents = await prisma.agent.findMany({
      where: { userId: session.user?.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { reviews: true, bindings: true },
        },
      },
    });

    // Seed preset agents for first-time users
    if (agents.length === 0 && session.user?.id) {
      console.log(`🌱 Seeding preset agents for user ${session.user.id}`);
      const newAgents = await seedPresetAgents(session.user.id);
      
      // Fetch the newly created agents with counts
      agents = await prisma.agent.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { reviews: true, bindings: true },
          },
        },
      });
    }

    return NextResponse.json(agents);
  } catch (error: any) {
    console.error('Error in GET /api/agents:', error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    
    if (!session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validated = AgentSchema.parse(body);

    const agent = await prisma.agent.create({
      data: {
        ...validated,
        userId: session.user.id,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}

