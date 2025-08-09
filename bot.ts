// bot.ts
import { Ollama } from "@llamaindex/ollama";
import { OllamaEmbedding } from "@llamaindex/ollama";
import { Document, VectorStoreIndex, Settings, storageContextFromDefaults } from "llamaindex";
import { ChromaVectorStore } from "@llamaindex/chroma";
import fs from "fs/promises";

async function main() {
  // Leer el contenido de notes.txt como documento de ejemplo
  const notes = await fs.readFile("./notes.txt", "utf-8");
  const documents = [new Document({ text: notes, id_: "notes" })];

  // Inicializar Ollama como LLM y modelo de embeddings
  const ollama = new Ollama({ model: "gemma3:1b" })
  Settings.llm = ollama;
  Settings.embedModel = new OllamaEmbedding({ model: "nomic-embed-text" });

  // Inicializar Chroma como vector store (modo local por defecto)
  const vectorStore = new ChromaVectorStore({
    collectionName: "citas",
  });
  const storageContext = await storageContextFromDefaults({ vectorStore });

  // Crear el índice y almacenar embeddings
  const index = await VectorStoreIndex.fromDocuments(documents, storageContext);

  // Crear el query engine
  const queryEngine = index.asQueryEngine();
  const response = await queryEngine.query({ query: "¿Tienes cita mañana a las 6:00am en Buga?" });
  console.log(response.message);
}

main();
