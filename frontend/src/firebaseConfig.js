// Import as funções necessárias dos SDKs
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Importação que faltava

// Sua configuração do Firebase (mantida conforme você enviou)
const firebaseConfig = {
  apiKey: "AIzaSyAPJxAWb-OQz-yxOdjDy2AXG1xsdAar9tc",
  authDomain: "estoque-health-ybera.firebaseapp.com",
  projectId: "estoque-health-ybera",
  storageBucket: "estoque-health-ybera.firebasestorage.app",
  messagingSenderId: "483734994319",
  appId: "1:483734994319:web:32d954e098f50863b41ffa"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e EXPORTA o Firestore para usar no Inventário
export const db = getFirestore(app);