<<<<<<< HEAD
<file upload>
=======
import { Ollama } from "@llamaindex/ollama";
import { OllamaEmbedding } from "@llamaindex/ollama";
import { Document, VectorStoreIndex, Settings, storageContextFromDefaults } from "llamaindex";
import { ChromaVectorStore } from "@llamaindex/chroma";

async function setup() {
  // Documentos de ejemplo para poblar la colección "citas"
  const docs = [
    new Document({
      text: "Cita disponible el 2025-08-10 a las 5:00am en Buga por $20.000",
      metadata: { ciudad: "Buga" },
      id_: "1"
    }),
    new Document({
      text: "Cita disponible el 2025-08-10 a las 6:30am en Buga por $20.000",
      metadata: { ciudad: "Buga" },
      id_: "2"
    })
  ];

  // Inicializar Ollama como LLM y modelo de embeddings
  const ollama = new Ollama({ model: "gemma:2b" });
  Settings.llm = ollama;
  Settings.embedModel = new OllamaEmbedding({ model: "nomic-embed-text" });

  // Inicializar Chroma como vector store
  const vectorStore = new ChromaVectorStore({
    collectionName: "citas",
  });
  const storageContext = await storageContextFromDefaults({ vectorStore });

  // Crear el índice y almacenar embeddings
  await VectorStoreIndex.fromDocuments(docs, storageContext);
  console.log("Base de datos Chroma poblada correctamente con citas de ejemplo.");
}

setup();
>>>>>>> 25a86dc (feat: Implement Ollama service for local LLM processing)
