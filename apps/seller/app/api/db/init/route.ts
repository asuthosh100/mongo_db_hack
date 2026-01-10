import { NextResponse } from "next/server";
import { initializeIndexes, getDatabase } from "@/lib/db";

export async function POST() {
  try {
    // Test connection
    const db = await getDatabase();
    await db.command({ ping: 1 });

    // Initialize indexes
    await initializeIndexes();

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
      database: db.databaseName,
    });
  } catch (error) {
    console.error("Database initialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });

    // Get collection stats
    const collections = await db.listCollections().toArray();

    return NextResponse.json({
      success: true,
      connected: true,
      database: db.databaseName,
      collections: collections.map((c) => c.name),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
