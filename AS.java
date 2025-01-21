import java.util.concurrent.*;

@Service
public class ProducerService {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private static final int TOTAL_MESSAGES = 1_000_000;
    private static final int PARTITIONS = 5;  // Number of Kafka partitions
    private static final int THREADS = 5;     // Number of producer threads
    private static final int MESSAGES_PER_THREAD = TOTAL_MESSAGES / THREADS;
    private static final int MESSAGES_PER_SEC = 500; // Target messages per second

    private final ExecutorService executorService;
    private final AtomicInteger[] messageCounters = new AtomicInteger[THREADS];

    public ProducerService(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
        this.executorService = Executors.newFixedThreadPool(THREADS);
        
        for (int i = 0; i < THREADS; i++) {
            messageCounters[i] = new AtomicInteger(0);
        }
    }

    public void startSendingMessages() {
        System.out.println("Starting to send messages using " + THREADS + " threads...");

        // Create a list of Callable tasks
        List<Callable<Void>> tasks = new ArrayList<>();
        for (int i = 0; i < THREADS; i++) {
            tasks.add(new MessageTask(i, messageCounters[i], kafkaTemplate));
        }

        // Submit all tasks to the executor service
        try {
            executorService.invokeAll(tasks); // Runs all tasks in parallel
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        System.out.println("All message tasks submitted.");
    }

    // Define the Callable Task for sending messages
    private static class MessageTask implements Callable<Void> {
        private final int threadId;
        private final AtomicInteger messageCounter;
        private final KafkaTemplate<String, String> kafkaTemplate;

        public MessageTask(int threadId, AtomicInteger messageCounter, KafkaTemplate<String, String> kafkaTemplate) {
            this.threadId = threadId;
            this.messageCounter = messageCounter;
            this.kafkaTemplate = kafkaTemplate;
        }

        @Override
        public Void call() {
            String threadName = Thread.currentThread().getName();
            System.out.println("Thread [" + threadName + "] STARTED...");

            int messagesSent = 0;

            while (messageCounter.incrementAndGet() <= MESSAGES_PER_THREAD) {
                String key = "key-" + threadId;
                String payload = TradeMessageGenerator.generateTradeMessage().getName();
                kafkaTemplate.send("trade", key, payload);

                if (++messagesSent % MESSAGES_PER_SEC == 0) {
                    System.out.println("Thread [" + threadName + "] sent " + messagesSent + " messages.");
                }

                try {
                    Thread.sleep(10); // Simulate message delay to avoid spamming Kafka
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }

            System.out.println("Thread [" + threadName + "] Finished sending messages.");
            return null;
        }
    }
}
