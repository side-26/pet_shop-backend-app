export class WriteBehindStrategy {
  #store;
  #queue;

  constructor({ store, queue }) {
    this.#store = store;
    this.#queue = queue;
  }

  async execute({ key, value, ttlSeconds, jobName, jobData, jobId }) {
    /*
     * Update cache first.
     */
    await this.#store.set(key, value, {
      ttlSeconds,
    });

    try {
      await this.#queue.add(jobName, jobData, {
        jobId,

        attempts: 5,

        backoff: {
          type: 'exponential',
          delay: 1000,
        },

        removeOnComplete: 1000,

        removeOnFail: 5000,
      });
    } catch (error) {
      /*
       * Cache says write happened but queue could not
       * guarantee DB persistence.
       *
       * Remove cache so consumers don't trust it.
       */
      await this.#store.delete(key);

      throw error;
    }

    return value;
  }
}
