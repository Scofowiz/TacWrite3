/**
 * Production-ready logging system with agent personalities
 * One line, one message - simple enough for a child to read
 * Extends existing vite.ts log function with personality features
 */

/**
 * Get formatted timestamp matching existing log format
 */
function getTimestamp(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Simple, child-readable logger with agent personalities
 * Uses same format as existing vite.ts log function
 */
export class Logger {
  /**
   * Log a simple info message
   */
  static info(message: string): void {
    console.log(`${getTimestamp()} [info] ℹ️  ${message}`);
  }

  /**
   * Log a success message
   */
  static success(message: string): void {
    console.log(`${getTimestamp()} [success] ✅ ${message}`);
  }

  /**
   * Log a warning message
   */
  static warning(message: string): void {
    console.log(`${getTimestamp()} [warning] ⚠️  ${message}`);
  }

  /**
   * Log an error message
   */
  static error(message: string): void {
    console.log(`${getTimestamp()} [error] ❌ ${message}`);
  }

  /**
   * Doctor Agent - The system's caring physician
   */
  static doctor(message: string): void {
    console.log(`${getTimestamp()} [doctor] 🩺 ${message}`);
  }

  /**
   * Marie Kondo - The polite cleanup specialist
   */
  static marie(message: string, sparkJoy: boolean = false): void {
    const emoji = sparkJoy ? '✨' : '🧹';
    console.log(`${getTimestamp()} [marie] ${emoji} ${message}`);
  }
}

/**
 * Doctor Agent personality messages
 */
export const DoctorMessages = {
  healthCheck: () => "Checking everyone's heartbeat...",
  allHealthy: () => "Everyone looks healthy and happy!",
  foundIssue: (issue: string) => `Uh oh, ${issue} needs attention`,
  spawningAgent: (agentType: string) => `Bringing a new ${agentType} friend into the world`,
  agentBorn: (agentType: string) => `Welcome, little ${agentType}! You're gonna do great things`,
  emergency: () => "Emergency! All hands on deck!",
  restartingAgent: (agentId: string) => `Giving ${agentId} a gentle restart`,
  systemGood: () => "System is purring like a kitten",
  systemStressed: () => "Things are getting a bit busy here",
  callingMarie: () => "Calling Marie for emergency cleanup duty",
  checkupComplete: () => "Checkup done! Everyone's doing their best",
};

/**
 * Marie Kondo personality messages
 */
export const MarieMessages = {
  waking: () => "Marie wakes up and stretches",
  sleeping: () => "Marie goes back to sleep peacefully",
  startingCleanup: () => "Time to tidy up!",
  
  // The special "thank you and yeet" messages
  thankingData: (dataType: string, size: string) => 
    `Thank you ${dataType} for your service (${size}). *yeets into the void*`,
  
  thankingCache: (size: string) => 
    `Thank you old cache data (${size}). You served well! *yeet*`,
  
  thankingLogs: (size: string) => 
    `Thank you ancient logs (${size}). Rest now! *yeet*`,
  
  thankingTempFiles: (size: string) => 
    `Thank you temporary files (${size}). Your work is done! *yeet*`,
  
  thankingMemory: (size: string) => 
    `Thank you unused memory (${size}). Making room for new friends! *yeet*`,
  
  // Other Marie messages
  organizing: (what: string) => `Organizing ${what} neatly`,
  sparkJoy: (what: string) => `${what} sparks joy! ✨`,
  noJoy: (what: string) => `${what} doesn't spark joy anymore`,
  cleanupDone: (totalCleared: string) => `All done! Cleared ${totalCleared} of clutter`,
  emergency: () => "Emergency cleanup mode activated!",
  beastMode: () => "Going full beast mode on this mess",
  satisfied: () => "Everything is tidy and organized now",
  proud: () => "Look how nice and clean everything is!",
};

/**
 * Simple production logging for server routes
 */
export const RouteLogger = {
  documentCreated: (title: string) => 
    Logger.success(`Created new document: ${title}`),
  
  documentUpdated: (id: string) => 
    Logger.success(`Saved changes to document ${id}`),
  
  documentDeleted: (title: string) => 
    Logger.info(`Deleted document: ${title}`),
  
  aiStarting: (type: string, provider: string) => 
    Logger.info(`AI ${type} starting with ${provider}`),
  
  aiComplete: (type: string) => 
    Logger.success(`AI ${type} finished successfully`),
  
  aiError: (type: string, error: string) => 
    Logger.error(`AI ${type} failed: ${error}`),
  
  userAction: (action: string, user: string) => 
    Logger.info(`${user} ${action}`),
  
  error: (what: string, why: string) => 
    Logger.error(`${what} failed: ${why}`),
};
