import React from 'react'
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const MessageBubble = () => {
    const navigate = useNavigate();
    const [content, setContent] = useState("")
    const [status, setStatus] = useState("idle")
    const [error, seterror] = useState("")
    const [role, setRole] = useState("assistant")


    const handleclick = () => navigate("path/to/agent/stream");
  return (
    <div>MessageBubble</div>
  )
}

export default MessageBubble