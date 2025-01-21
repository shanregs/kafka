producer:
  totalMessages: 1000000
  partitions: 5
  threads: 5
  messagesPerSec: 500

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "producer")
public class ProducerConfig {

    private int totalMessages;
    private int partitions;
    private int threads;
    private int messagesPerSec;

    public int getTotalMessages() {
        return totalMessages;
    }

    public void setTotalMessages(int totalMessages) {
        this.totalMessages = totalMessages;
    }

    public int getPartitions() {
        return partitions;
    }

    public void setPartitions(int partitions) {
        this.partitions = partitions;
    }

    public int getThreads() {
        return threads;
    }

    public void setThreads(int threads) {
        this.threads = threads;
    }

    public int getMessagesPerSec() {
        return messagesPerSec;
    }

    public void setMessagesPerSec(int messagesPerSec) {
        this.messagesPerSec = messagesPerSec;
    }
}
