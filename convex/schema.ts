import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const applicationTables = {
  analyses: defineTable({
    type: v.union(v.literal("text"), v.literal("image")),
    content: v.string(),
    result: v.union(v.literal("Real"), v.literal("Fake"), v.literal("Pending")),
    confidence: v.number(),
    timestamp: v.number(),
    userId: v.optional(v.id("users")),
  }).index("by_timestamp", ["timestamp"]),
  
  contacts: defineTable({
    name: v.string(),
    email: v.string(),
    message: v.string(),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
