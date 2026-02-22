import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    type: v.union(v.literal("text"), v.literal("image")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Create analysis with pending status
    const analysisId = await ctx.db.insert("analyses", {
      type: args.type,
      content: args.content,
      result: "Pending",
      confidence: 0,
      timestamp: Date.now(),
    });

    // Simulate AI analysis (replace with actual AI model later)
    // For now, return a mock result based on content length
    const mockConfidence = Math.random() * 0.3 + 0.65; // 65-95%
    const mockResult = mockConfidence > 0.75 ? "Real" : "Fake";

    // Update with result
    await ctx.db.patch(analysisId, {
      result: mockResult,
      confidence: Math.round(mockConfidence * 100) / 100,
    });

    return analysisId;
  },
});

export const get = query({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("analyses")
      .withIndex("by_timestamp")
      .order("desc")
      .take(10);
  },
});
