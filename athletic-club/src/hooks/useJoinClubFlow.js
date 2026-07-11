import { useState } from "react";
import { orgtreeLinks } from "../services/orgtreeLinks";

function useJoinClubFlow() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinError, setJoinError] = useState("");

  const openJoinModal = () => {
    setJoinError("");
    setIsJoinModalOpen(true);
  };

  const closeJoinModal = () => {
    setIsJoinModalOpen(false);
    setJoinError("");
  };

  const confirmStudent = () => {
    window.location.assign(orgtreeLinks.joinClub);
  };

  const rejectStudent = () => {
    setJoinError(
      "Only Aditya Institutions students are authorized to request club membership.",
    );
  };

  return {
    isJoinModalOpen,
    joinError,
    openJoinModal,
    closeJoinModal,
    confirmStudent,
    rejectStudent,
  };
}

export default useJoinClubFlow;
