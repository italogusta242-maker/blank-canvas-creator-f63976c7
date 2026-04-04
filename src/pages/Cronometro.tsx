import { Navigate } from "react-router-dom";

const Cronometro = () => {
  // O MODO WAR ROOM DESTRUIU O CRONÔMETRO
  // Todos os usuários que caírem aqui são arremessados diretamente para a plataforma
  return <Navigate to="/aluno" replace />;
};

export default Cronometro;
