import express, { Request, Response } from "express";
import { TopContributorsManager } from "./topContributors.js";

export class WebhookServer {
  private app: express.Application;
  private server: any;
  private readonly BOT_WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET;
  private readonly PORT = Number(process.env.WEBHOOK_PORT);
  private readonly PUBLIC_URL = process.env.PUBLIC_URL || "https://services-t7ru.alwaysdata.net";
  private guild: any;

  constructor(guild: any) {
    this.app = express();
    this.guild = guild;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    this.app.post("/webhook/recap-update", (async (
      req: Request,
      res: Response,
    ) => {
      try {
        const authHeader = req.headers.authorization;
        const expectedAuth = `Bearer ${this.BOT_WEBHOOK_SECRET}`;

        if (!this.BOT_WEBHOOK_SECRET || authHeader !== expectedAuth) {
          console.log("❌ Unauthorized recap update request");
          return res.status(401).json({ error: "Unauthorized" });
        }

        console.log("📊 Recap update notification received, syncing top contributors...");

        const result = await TopContributorsManager.syncAllTopContributorRoles(this.guild);

        console.log(`✅ Top contributor sync complete:`, {
          processed: result.processed,
          rolesGranted: result.rolesGranted,
          rolesRemoved: result.rolesRemoved,
          errors: result.errors.length,
        });

        if (result.errors.length > 0) {
          console.error("❌ Errors during sync:", result.errors);
        }

        res.status(200).json({
          success: true,
          message: "Top contributors synced successfully",
          stats: result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Error processing recap update webhook:", error);
        res.status(500).json({
          success: false,
          error: "Internal server error",
          timestamp: new Date().toISOString(),
        });
      }
    }) as express.RequestHandler);

    this.app.get("/health", (_req, res) => {
      res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        guild: this.guild ? this.guild.name : "Not connected",
        port: this.PORT,
        publicUrl: this.PUBLIC_URL,
      });
    });
  }

  public start(): void {
    this.server = this.app.listen(this.PORT, "::", () => {
      console.log(`🌐 Webhook server listening on port ${this.PORT} (IPv6)`);
      console.log(`📡 Health check: ${this.PUBLIC_URL}/health`);
      console.log(`🔔 Webhook endpoint: ${this.PUBLIC_URL}/webhook/recap-update`);
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      console.log("🛑 Webhook server stopped");
    }
  }
}
