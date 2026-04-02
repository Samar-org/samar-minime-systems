import { Dataset, TrainingJob, DatasetSchema, TrainingJobSchema } from '../models/training.types';

export class TrainingService {
  private datasets: Map<string, Dataset> = new Map();
  private jobs: Map<string, TrainingJob> = new Map();

  createDataset(dataset: Dataset): void {
    const validated = DatasetSchema.parse(dataset);
    this.datasets.set(validated.id, validated);
  }

  getDataset(id: string): Dataset | undefined {
    return this.datasets.get(id);
  }

  startTrainingJob(job: TrainingJob): void {
    const validated = TrainingJobSchema.parse(job);
    this.jobs.set(validated.id, validated);
  }

  getJobStatus(jobId: string): TrainingJob | undefined {
    return this.jobs.get(jobId);
  }

  listJobs(): TrainingJob[] {
    return Array.from(this.jobs.values());
  }
}
