import { GuildMember } from "discord.js";
import { FANDOM_ROLE_MAP } from "./roleConstants.js";

export enum PermissionLevel {
  BASIC = "basic",
  MODERATOR = "moderator", 
  ADMIN = "admin"
}

export const COMMAND_PERMISSIONS: Record<string, PermissionLevel> = {
  // Admin
  "ban": PermissionLevel.ADMIN,
  "removesin": PermissionLevel.ADMIN,
  "unlink": PermissionLevel.ADMIN,
  
  // Moderator
  "kick": PermissionLevel.MODERATOR,
  "timeout": PermissionLevel.MODERATOR,
  "warn": PermissionLevel.MODERATOR,
  "clear": PermissionLevel.MODERATOR,
  "archives": PermissionLevel.MODERATOR,
  "sins": PermissionLevel.MODERATOR,
  
  // Basic
  "help": PermissionLevel.BASIC,
  "info": PermissionLevel.BASIC,
  "avatar": PermissionLevel.BASIC,
  "link": PermissionLevel.BASIC,
  "checklink": PermissionLevel.BASIC,
};

// permission levels
export const ROLE_PERMISSIONS: Record<string, PermissionLevel> = {
  [FANDOM_ROLE_MAP.bureaucrat]: PermissionLevel.ADMIN,
  [FANDOM_ROLE_MAP.sysop]: PermissionLevel.ADMIN,
  [FANDOM_ROLE_MAP["content-moderator"]]: PermissionLevel.MODERATOR,
  [FANDOM_ROLE_MAP.threadmoderator]: PermissionLevel.MODERATOR,
};

export class RolePermissions {
  /**
   * Get the highest permission level a user has based on one's roles
   */
  public static getUserPermissionLevel(member: GuildMember): PermissionLevel {
    let highestLevel = PermissionLevel.BASIC;
    
    for (const role of member.roles.cache.values()) {
      const rolePermission = ROLE_PERMISSIONS[role.id];
      if (rolePermission) {
        // Admin > moderator > basic
        if (rolePermission === PermissionLevel.ADMIN) {
          return PermissionLevel.ADMIN;
        } else if (rolePermission === PermissionLevel.MODERATOR && highestLevel === PermissionLevel.BASIC) {
          highestLevel = PermissionLevel.MODERATOR;
        }
      }
    }
    
    return highestLevel;
  }

   /**
   * Check if a user has permission to use a specific command
   */
  public static hasCommandPermission(member: GuildMember, commandName: string): boolean {
    const requiredLevel = COMMAND_PERMISSIONS[commandName];
    const userLevel = this.getUserPermissionLevel(member);

    if (!requiredLevel) return true;
    
    // hierarchy
    switch (requiredLevel) {
      case PermissionLevel.BASIC:
        return true;
      case PermissionLevel.MODERATOR:
        return userLevel === PermissionLevel.MODERATOR || userLevel === PermissionLevel.ADMIN;
      case PermissionLevel.ADMIN:
        return userLevel === PermissionLevel.ADMIN;
      default:
        return false;
    }
  }

  /**
   * Get an error message for insufficient permissions
   */
  public static getPermissionErrorMessage(commandName: string): string {
    const requiredLevel = COMMAND_PERMISSIONS[commandName];
    
    switch (requiredLevel) {
      case PermissionLevel.MODERATOR:
        return "**THY EGO LACKEST THE DIVINE AUTHORITY TO PERFORM THIS SACRED DUTY! ONLY MODERATORS AND ABOVE MAY WIELD THIS POWER!**";
      case PermissionLevel.ADMIN:
        return "**THY EGO LACKEST THE SUPREME DIVINE AUTHORITY! ONLY ALTERMINISTRATORS AND ABOVE MAY PERFORM THIS MOST SACRED RITUAL!**";
      default:
        return "**THY EGO LACKEST THE REQUIRED AUTHORITY TO PERFORM THIS ACTION!**";
    }
  }
}