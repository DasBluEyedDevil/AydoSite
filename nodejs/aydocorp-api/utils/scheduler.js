// utils/scheduler.js
/**
 * Scheduler utility for periodic tasks
 * Note: Google API integration has been removed
 */
class Scheduler {
  constructor() {
    this.jobs = {};
    this.initialized = false;
  }

  /**
   * Initialize the scheduler
   */
  initialize() {
    if (this.initialized) {
      console.log('Scheduler already initialized');
      return;
    }

    console.log('Initializing scheduler...');

    // No scheduled jobs after Google API integration removal

    this.initialized = true;
    console.log('Scheduler initialized successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    console.log('Stopping all scheduled jobs...');
    Object.values(this.jobs).forEach(job => job.stop());
    console.log('All scheduled jobs stopped');
  }
}

// Export a singleton instance
const scheduler = new Scheduler();
module.exports = scheduler;
