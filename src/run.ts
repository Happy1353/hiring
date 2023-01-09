import { IExecutor } from "./Executor";
import ITask from "./Task";

export default async function run(
  executor: IExecutor,
  queue: AsyncIterable<ITask>,
  maxThreads = 0
): Promise<any> {
  maxThreads = Math.max(0, maxThreads);
  executor.start();

  let runningPromises: Promise<void>[] = [];
  const currentQueue = [];

  for await (const i of queue) currentQueue.push(i);

  while (currentQueue.length > 0) {
    let qIdx = 0;
    while (qIdx < currentQueue.length) {
      const task = currentQueue[qIdx];

      if (maxThreads > 0 && runningPromises.length >= maxThreads) {
        break;
      }

      if (executor.executeData.running[task.targetId]) {
        qIdx++;
      } else {
        currentQueue.splice(qIdx, 1);
        const promise = executor.executeTask(task).then(() => {
          runningPromises = runningPromises.filter((p) => p !== promise);
        });
        runningPromises.push(promise);
      }
    }
    await Promise.race(runningPromises);
  }

  await Promise.all(runningPromises);

  executor.stop();
}
