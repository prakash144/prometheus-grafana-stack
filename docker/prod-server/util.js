function getRandomValue(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

function doSomeHeavyTask() {
  const startTime = Date.now();
  const ms = getRandomValue([100, 150, 200, 300, 500, 600, 1000]);
  const shouldThrowError = Math.random() < 0.25;

  console.log(
    `[INFO] HeavyTask started | delay=${ms}ms | errorChance=${shouldThrowError}`
  );

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const duration = Date.now() - startTime;

      if (shouldThrowError) {
        const randomError = getRandomValue([
          "DB Payment Failure",
          "DB Server is Down",
          "Access Denied",
          "Not Found Error",
        ]);

        console.error(
          `[ERROR] HeavyTask failed | duration=${duration}ms | reason="${randomError}"`
        );

        return reject(new Error(randomError));
      }

      console.log(
        `[INFO] HeavyTask completed | duration=${duration}ms`
      );

      resolve(duration);
    }, ms);
  });
}

module.exports = { doSomeHeavyTask };
