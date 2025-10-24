import { createCanvas, loadImage, CanvasRenderingContext2D } from "canvas";
import { User, Client } from "discord.js";
import { FamilyManager } from "./familyManager.js";

interface TreeNode {
  user: User;
  level: number;
  x: number;
  y: number;
  children: TreeNode[];
  spouses?: User[];
  parents: TreeNode[];
  siblings: TreeNode[];
}

interface RelationshipConnection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: "spouse" | "parent" | "child" | "sibling";
  targetUser: User;
}

interface UniqueNode {
  user: User;
  x: number;
  y: number;
  isRoot: boolean;
  level: number;
}

export class FamilyTreeRenderer {
  private static readonly NODE_WIDTH = 350;
  private static readonly NODE_HEIGHT = 120;
  private static readonly HORIZONTAL_SPACING = 120;
  private static readonly VERTICAL_SPACING = 180;
  private static readonly AVATAR_SIZE = 80;
  private static readonly MIN_CANVAS_WIDTH = 1920;
  private static readonly MIN_CANVAS_HEIGHT = 1080;
  private static readonly PADDING = 50;

  private static readonly RELATIONSHIP_COLORS = {
    spouse: {
      start: "#FF6B9D",
      end: "#C44569",
    },
    parent: {
      start: "#4FACFE",
      end: "#00F2FE",
    },
    child: {
      start: "#43E97B",
      end: "#38F9D7",
    },
    sibling: {
      start: "#A770EF",
      end: "#CF8BF3",
    },
  };

  private static readonly BACKGROUND_GRADIENT = {
    start: "#000000",
    middle: "#1A1A1A",
    end: "#2D2D2D",
  };

  public static async generateTree(
    rootUser: User,
    client: Client,
    guildId: string,
  ): Promise<Buffer> {
    const tree = await this.buildCompleteTreeStructure(rootUser, client, guildId);
    
    const bounds = this.calculateTreeBounds(tree);
    const { width, height } = this.calculateCanvasSize(bounds);
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    this.drawModernBackground(ctx, width, height);
    await this.drawCompleteTree(ctx, tree);

    return canvas.toBuffer("image/png");
  }

  private static async buildCompleteTreeStructure(
    rootUser: User,
    client: Client,
    guildId: string,
  ): Promise<TreeNode> {
    const processedUsers = new Set<string>();
    
    const buildNode = async (user: User, level: number, visited: Set<string>): Promise<TreeNode> => {
      if (visited.has(user.id)) {
        return {
          user,
          level,
          x: 0,
          y: 0,
          children: [],
          parents: [],
          siblings: [],
          spouses: [],
        };
      }

      visited.add(user.id);
      processedUsers.add(user.id);

      // user relationships
      const spouseIds = await FamilyManager.getSpouses(user.id);
      const parentIds = await FamilyManager.getParents(user.id);
      const childIds = await FamilyManager.getChildren(user.id);
      const siblingIds = await FamilyManager.getSiblings(user.id);

      // user objects
      const spouses = await this.fetchUsers(spouseIds, client, guildId);
      const parents = await this.fetchUsers(parentIds, client, guildId);
      const children = await this.fetchUsers(childIds, client, guildId);
      const siblings = await this.fetchUsers(siblingIds, client, guildId);

      const node: TreeNode = {
        user,
        level,
        x: 0,
        y: 0,
        children: [],
        parents: [],
        siblings: [],
        spouses,
      };

      for (const parent of parents) {
        if (!visited.has(parent.id)) {
          const parentNode = await buildNode(parent, level - 1, new Set(visited));
          node.parents.push(parentNode);
        }
      }

      // this wont recurse into their children to avoid duplication
      node.siblings = siblings.map(sibling => ({
        user: sibling,
        level,
        x: 0,
        y: 0,
        children: [],
        parents: [],
        siblings: [],
        spouses: [],
      }));

      for (const child of children) {
        if (!visited.has(child.id)) {
          const childNode = await buildNode(child, level + 1, new Set(visited));
          node.children.push(childNode);
        }
      }

      return node;
    };

    return await buildNode(rootUser, 0, new Set());
  }

  private static async fetchUsers(userIds: string[], client: Client, guildId: string): Promise<User[]> {
    const users: User[] = [];
    
    for (const userId of userIds) {
      try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        users.push(member.user);
      } catch (error) {
        console.error(`Failed to fetch user ${userId}:`, error);
      }
    }
    
    return users;
  }

  private static calculateTreeBounds(node: TreeNode): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    this.calculatePositions(node);
    
    const bounds = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    };

    const updateBounds = (n: TreeNode) => {
      const left = n.x - this.NODE_WIDTH / 2;
      const right = n.x + this.NODE_WIDTH / 2;
      const top = n.y;
      const bottom = n.y + this.NODE_HEIGHT;

      bounds.minX = Math.min(bounds.minX, left);
      bounds.maxX = Math.max(bounds.maxX, right);
      bounds.minY = Math.min(bounds.minY, top);
      bounds.maxY = Math.max(bounds.maxY, bottom);

      if (n.spouses && n.spouses.length > 0) {
        const spouseCount = n.spouses.length;
        const spouseWidth = (this.NODE_WIDTH + this.HORIZONTAL_SPACING) * spouseCount;
        bounds.maxX = Math.max(bounds.maxX, n.x + this.NODE_WIDTH / 2 + this.HORIZONTAL_SPACING + spouseWidth);
      }
      n.parents.forEach(parent => updateBounds(parent));
      n.siblings.forEach(sibling => updateBounds(sibling));
      n.children.forEach(child => updateBounds(child));
    };

    updateBounds(node);
    
    return bounds;
  }

  private static calculateCanvasSize(bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }): { width: number; height: number } {
    const requiredWidth = bounds.maxX - bounds.minX + this.PADDING * 2;
    const requiredHeight = bounds.maxY - bounds.minY + this.PADDING * 2;

    let width = Math.max(this.MIN_CANVAS_WIDTH, requiredWidth);
    let height = Math.max(this.MIN_CANVAS_HEIGHT, requiredHeight);

    const targetRatio = 16 / 9;
    const currentRatio = width / height;

    if (currentRatio > targetRatio) {
      height = width / targetRatio;
    } else if (currentRatio < targetRatio) {
      width = height * targetRatio;
    }

    return {
      width: Math.ceil(width),
      height: Math.ceil(height),
    };
  }

  private static drawModernBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, this.BACKGROUND_GRADIENT.start);
    gradient.addColorStop(0.5, this.BACKGROUND_GRADIENT.middle);
    gradient.addColorStop(1, this.BACKGROUND_GRADIENT.end);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    ctx.beginPath();
    ctx.arc(100, 100, 200, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(width - 150, height - 150, 250, 0, Math.PI * 2);
    ctx.fill();
  }

  private static async drawCompleteTree(
    ctx: CanvasRenderingContext2D,
    tree: TreeNode,
  ): Promise<void> {
    this.calculatePositions(tree);
    const uniqueNodes = this.collectAllUniqueNodes(tree);
    const connections = this.collectAllConnections(tree, uniqueNodes);

    this.drawConnections(ctx, connections);
    await this.drawUniqueNodes(ctx, uniqueNodes);
  }

  private static collectAllUniqueNodes(node: TreeNode, uniqueNodes = new Map<string, UniqueNode>()): Map<string, UniqueNode> {
    if (!uniqueNodes.has(node.user.id)) {
      uniqueNodes.set(node.user.id, {
        user: node.user,
        x: node.x - this.NODE_WIDTH / 2,
        y: node.y,
        isRoot: node.level === 0,
        level: node.level,
      });
    }

    const occupiedPositions = new Set<number>();
    uniqueNodes.forEach((nodeData) => {
      if (nodeData.y === node.y) {
        occupiedPositions.add(nodeData.x);
      }
    });

    let spouseIndex = 0;
    node.spouses?.forEach((spouse) => {
      if (!uniqueNodes.has(spouse.id)) {
        let spouseX: number;
        let attempts = 0;
        const maxAttempts = 20;
        
        do {
          spouseX = node.x + this.NODE_WIDTH / 2 + this.HORIZONTAL_SPACING + (this.NODE_WIDTH + this.HORIZONTAL_SPACING) * (spouseIndex + attempts);
          attempts++;
        } while (occupiedPositions.has(spouseX) && attempts < maxAttempts);
        
        uniqueNodes.set(spouse.id, {
          user: spouse,
          x: spouseX,
          y: node.y,
          isRoot: false,
          level: node.level,
        });
        
        occupiedPositions.add(spouseX);
        spouseIndex++;
      }
    });

    node.parents.forEach(parent => this.collectAllUniqueNodes(parent, uniqueNodes));
    node.siblings.forEach(sibling => {
      if (!uniqueNodes.has(sibling.user.id)) {
        uniqueNodes.set(sibling.user.id, {
          user: sibling.user,
          x: sibling.x - this.NODE_WIDTH / 2,
          y: sibling.y,
          isRoot: false,
          level: sibling.level,
        });
      }
    });

    node.children.forEach(child => this.collectAllUniqueNodes(child, uniqueNodes));

    return uniqueNodes;
  }

  private static collectAllConnections(
    node: TreeNode,
    uniqueNodes: Map<string, UniqueNode>,
    connections: RelationshipConnection[] = [],
    processed = new Set<string>(),
  ): RelationshipConnection[] {
    if (processed.has(node.user.id)) {
      return connections;
    }
    
    processed.add(node.user.id);
    
    const currentNode = uniqueNodes.get(node.user.id)!;
    const rootCenterX = currentNode.x + this.NODE_WIDTH / 2;
    const rootCenterY = currentNode.y + this.NODE_HEIGHT / 2;
    const rootBottom = currentNode.y + this.NODE_HEIGHT;
    const rootRight = currentNode.x + this.NODE_WIDTH;

    node.parents.forEach((parent) => {
      const parentNode = uniqueNodes.get(parent.user.id);
      if (parentNode) {
        const parentCenterX = parentNode.x + this.NODE_WIDTH / 2;
        const parentBottom = parentNode.y + this.NODE_HEIGHT;
        connections.push({
          from: { x: rootCenterX, y: currentNode.y },
          to: { x: parentCenterX, y: parentBottom },
          type: "parent",
          targetUser: parent.user,
        });
      }
      this.collectAllConnections(parent, uniqueNodes, connections, processed);
    });

    node.siblings.forEach((sibling) => {
      const siblingNode = uniqueNodes.get(sibling.user.id);
      if (siblingNode) {
        const siblingCenterX = siblingNode.x + this.NODE_WIDTH / 2;
        const siblingCenterY = siblingNode.y + this.NODE_HEIGHT / 2;
        connections.push({
          from: { x: rootCenterX, y: rootCenterY },
          to: { x: siblingCenterX, y: siblingCenterY },
          type: "sibling",
          targetUser: sibling.user,
        });
      }
    });

    node.children.forEach((child) => {
      const childNode = uniqueNodes.get(child.user.id);
      if (childNode) {
        const childCenterX = childNode.x + this.NODE_WIDTH / 2;
        const childTop = childNode.y;
        const childCenterY = childNode.y + this.NODE_HEIGHT / 2;
        
        if (Math.abs(childNode.y - currentNode.y) < 10) {
          connections.push({
            from: { x: rootRight, y: rootCenterY },
            to: { x: childNode.x, y: childCenterY },
            type: "child",
            targetUser: child.user,
          });
        } else {
          connections.push({
            from: { x: rootCenterX, y: rootBottom },
            to: { x: childCenterX, y: childTop },
            type: "child",
            targetUser: child.user,
          });
        }
      }
      this.collectAllConnections(child, uniqueNodes, connections, processed);
    });

    node.spouses?.forEach((spouse) => {
      const spouseNode = uniqueNodes.get(spouse.id);
      if (spouseNode) {
        const spouseCenterY = spouseNode.y + this.NODE_HEIGHT / 2;
        connections.push({
          from: { x: rootRight, y: rootCenterY },
          to: { x: spouseNode.x, y: spouseCenterY },
          type: "spouse",
          targetUser: spouse,
        });
      }
    });

    return connections;
  }

  private static calculatePositions(node: TreeNode): void {
    const getDepth = (n: TreeNode, direction: 'up' | 'down'): number => {
      if (direction === 'up') {
        if (n.parents.length === 0) return 0;
        return 1 + Math.max(...n.parents.map(p => getDepth(p, 'up')));
      } else {
        if (n.children.length === 0) return 0;
        return 1 + Math.max(...n.children.map(c => getDepth(c, 'down')));
      }
    };

    const levelsAbove = getDepth(node, 'up');
    const levelsBelow = getDepth(node, 'down');
    const totalLevels = levelsAbove + 1 + levelsBelow;

    const totalHeight = totalLevels * (this.NODE_HEIGHT + this.VERTICAL_SPACING);

    const getMaxNodesAtLevel = (n: TreeNode, targetLevel: number, currentLevel: number = 0): number => {
      let count = 0;
      
      if (currentLevel === targetLevel) {
        count = 1 + (n.siblings?.length || 0) + (n.spouses?.length || 0);
      }
      
      if (currentLevel < targetLevel) {
        n.children.forEach(child => {
          count += getMaxNodesAtLevel(child, targetLevel, currentLevel + 1);
        });
      } else if (currentLevel > targetLevel) {
        n.parents.forEach(parent => {
          count += getMaxNodesAtLevel(parent, targetLevel, currentLevel - 1);
        });
      }
      
      return count;
    };

    let maxNodesAtAnyLevel = 1;
    for (let level = -levelsAbove; level <= levelsBelow; level++) {
      const nodesAtLevel = getMaxNodesAtLevel(node, level);
      maxNodesAtAnyLevel = Math.max(maxNodesAtAnyLevel, nodesAtLevel);
    }

    const minWidth = maxNodesAtAnyLevel * (this.NODE_WIDTH + this.HORIZONTAL_SPACING);
    const canvasWidth = Math.max(this.MIN_CANVAS_WIDTH, minWidth);
    const canvasHeight = Math.max(this.MIN_CANVAS_HEIGHT, totalHeight);
    
    const centerX = canvasWidth / 2;
    const rootY = this.PADDING + levelsAbove * (this.NODE_HEIGHT + this.VERTICAL_SPACING);

    const positionNode = (n: TreeNode, x: number, y: number) => {
      n.x = x;
      n.y = y;

      if (n.parents.length > 0) {
        const parentSpacing = this.NODE_WIDTH + this.HORIZONTAL_SPACING;
        const parentWidth = n.parents.length * parentSpacing;
        const parentStartX = x - (parentWidth - parentSpacing) / 2;
        
        n.parents.forEach((parent, index) => {
          const parentX = parentStartX + index * parentSpacing;
          const parentY = y - (this.NODE_HEIGHT + this.VERTICAL_SPACING);
          positionNode(parent, parentX, parentY);
        });
      }

      if (n.siblings.length > 0) {
        const siblingSpacing = this.NODE_WIDTH + this.HORIZONTAL_SPACING;
        const siblingsPerSide = Math.ceil(n.siblings.length / 2);
        
        n.siblings.forEach((sibling, index) => {
          if (index < siblingsPerSide) {
            sibling.x = x - (siblingsPerSide - index) * siblingSpacing;
          } else {
            sibling.x = x + (index - siblingsPerSide + 1) * siblingSpacing;
          }
          sibling.y = y;
        });
      }

      if (n.children.length > 0) {
        const childSpacing = this.NODE_WIDTH + this.HORIZONTAL_SPACING;
        const childWidth = n.children.length * childSpacing;
        const childStartX = x - (childWidth - childSpacing) / 2;
        
        n.children.forEach((child, index) => {
          const childX = childStartX + index * childSpacing;
          const childY = y + (this.NODE_HEIGHT + this.VERTICAL_SPACING);
          positionNode(child, childX, childY);
        });
      }
    };

    positionNode(node, centerX, rootY);
  }

  private static drawConnections(
    ctx: CanvasRenderingContext2D,
    connections: RelationshipConnection[],
  ): void {
    const connectionsByTarget = new Map<string, RelationshipConnection[]>();
    
    connections.forEach((conn) => {
      const targetId = conn.targetUser.id;
      const group = connectionsByTarget.get(targetId) || [];
      group.push(conn);
      connectionsByTarget.set(targetId, group);
    });

    connectionsByTarget.forEach((group) => {
      if (group.length === 1) {
        this.drawSingleConnection(ctx, group[0]);
      } else {
        this.drawMultipleConnections(ctx, group);
      }
    });
  }

  private static drawSingleConnection(
    ctx: CanvasRenderingContext2D,
    conn: RelationshipConnection,
  ): void {
    const colors = this.RELATIONSHIP_COLORS[conn.type];
    const gradient = ctx.createLinearGradient(conn.from.x, conn.from.y, conn.to.x, conn.to.y);
    gradient.addColorStop(0, colors.start);
    gradient.addColorStop(1, colors.end);
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    
    if (conn.type === "sibling") {
      ctx.setLineDash([10, 8]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.shadowColor = colors.start;
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.moveTo(conn.from.x, conn.from.y);
    ctx.lineTo(conn.to.x, conn.to.y);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
  }

  private static drawMultipleConnections(
    ctx: CanvasRenderingContext2D,
    connections: RelationshipConnection[],
  ): void {
    const offset = 10;
    
    connections.forEach((conn, index) => {
      const lineOffset = (index - (connections.length - 1) / 2) * offset;
      const colors = this.RELATIONSHIP_COLORS[conn.type];
      
      const dx = conn.to.x - conn.from.x;
      const dy = conn.to.y - conn.from.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const perpX = (-dy / length) * lineOffset;
      const perpY = (dx / length) * lineOffset;

      const fromX = conn.from.x + perpX;
      const fromY = conn.from.y + perpY;
      const toX = conn.to.x + perpX;
      const toY = conn.to.y + perpY;

      const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
      gradient.addColorStop(0, colors.start);
      gradient.addColorStop(1, colors.end);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      
      if (conn.type === "sibling") {
        ctx.setLineDash([10, 8]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.shadowColor = colors.start;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
    });
  }

  private static async drawUniqueNodes(
    ctx: CanvasRenderingContext2D,
    uniqueNodes: Map<string, UniqueNode>,
  ): Promise<void> {
    for (const [_userId, nodeData] of uniqueNodes) {
      await this.drawUserCard(
        ctx,
        nodeData.user,
        nodeData.x,
        nodeData.y,
        nodeData.isRoot,
      );
    }
  }

  private static async drawUserCard(
    ctx: CanvasRenderingContext2D,
    user: User,
    x: number,
    y: number,
    isRoot: boolean,
  ): Promise<void> {
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 10;

    if (isRoot) {
      const gradient = ctx.createLinearGradient(x, y, x + this.NODE_WIDTH, y + this.NODE_HEIGHT);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
      gradient.addColorStop(1, "rgba(124, 124, 124, 0.25)");
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    }

    this.roundRect(ctx, x, y, this.NODE_WIDTH, this.NODE_HEIGHT, 20);
    ctx.fill();

    if (isRoot) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    try {
      const avatarUrl = user.displayAvatarURL({ extension: "png", size: 128 });
      const avatar = await loadImage(avatarUrl);

      const avatarX = x + 15;
      const avatarY = y + (this.NODE_HEIGHT - this.AVATAR_SIZE) / 2;

      if (isRoot) {
        ctx.shadowColor = "#FFFFFF";
        ctx.shadowBlur = 20;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(
        avatarX + this.AVATAR_SIZE / 2,
        avatarY + this.AVATAR_SIZE / 2,
        this.AVATAR_SIZE / 2,
        0,
        Math.PI * 2,
      );
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(avatar, avatarX, avatarY, this.AVATAR_SIZE, this.AVATAR_SIZE);
      ctx.restore();

      if (isRoot) {
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
      }
      
      ctx.beginPath();
      ctx.arc(
        avatarX + this.AVATAR_SIZE / 2,
        avatarY + this.AVATAR_SIZE / 2,
        this.AVATAR_SIZE / 2,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      
      ctx.shadowBlur = 0;
    } catch (error) {
      ctx.fillStyle = "#888888";
      ctx.beginPath();
      ctx.arc(
        x + 15 + this.AVATAR_SIZE / 2,
        y + this.NODE_HEIGHT / 2,
        this.AVATAR_SIZE / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 32px Verdana`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const textX = x + this.AVATAR_SIZE + 30;
    const maxTextWidth = this.NODE_WIDTH - this.AVATAR_SIZE - 50;
    let username = user.username;
    
    while (ctx.measureText(username).width > maxTextWidth && username.length > 0) {
      username = username.slice(0, -1);
    }
    if (username.length < user.username.length) {
      username = username + "...";
    }
    
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 6;
    
    const hasDiscriminator = user.discriminator !== "0";
    const usernameY = hasDiscriminator 
      ? y + this.NODE_HEIGHT / 2 - 12
      : y + this.NODE_HEIGHT / 2;
    
    ctx.fillText(username, textX, usernameY);
    ctx.shadowBlur = 0;

    if (hasDiscriminator) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = `20px Verdana`;
      ctx.fillText(`#${user.discriminator}`, textX, y + this.NODE_HEIGHT / 2 + 16);
    }
  }

  private static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}