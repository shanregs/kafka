package com.example.jsonloader.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.*;
import java.nio.file.*;
import java.util.*;

@Service
public class JsonLoaderService {
    private final Map<String, List<JsonNode>> recordsMap = new HashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void loadJsonData() {
        String fileName = "data.txt";  // File in src/main/resources
        try {
            Path path = Paths.get(getClass().getClassLoader().getResource(fileName).toURI());
            List<String> lines = Files.readAllLines(path);

            for (String line : lines) {
                if (!line.trim().isEmpty()) {
                    JsonNode jsonNode = objectMapper.readTree(line);
                    String id = jsonNode.get("id").asText();
                    recordsMap.computeIfAbsent(id, k -> new ArrayList<>()).add(jsonNode);
                }
            }

            System.out.println("✅ Loaded " + recordsMap.size() + " unique IDs from data.txt!");

        } catch (Exception e) {
            throw new RuntimeException("Failed to load JSON records from file", e);
        }
    }

    public Map<String, List<JsonNode>> getRecordsMap() {
        return recordsMap;
    }
}
