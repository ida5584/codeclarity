'use client'
import { useEffect, useRef, useState } from "react";
import { Box, Button, Stack, TextField , Typography} from "@mui/material";
import {AppBar, Toolbar, IconButton, MenuIcon} from "@mui/material";
import ReactMarkdown from 'react-markdown';

// import AppBar from '@mui/material/AppBar';
// import Box from '@mui/material/Box';
// import Toolbar from '@mui/material/Toolbar';
// import Typography from '@mui/material/Typography';
// import Button from '@mui/material/Button';
// import IconButton from '@mui/material/IconButton';
// import MenuIcon from '@mui/icons-material/Menu';

import ace from 'brace';
import 'brace/mode/python';
import 'brace/theme/monokai';


export default function Home() {
  const [messages, setMessages] = useState([{
    role: 'assistant', 
    content: `Hello! Welcome to your technical interview. I'm your AI interviewer, here to assess your skills 
              in computer science topics such as algorithms, data structures, and problem-solving. Let's begin 
              with a coding question to get started.`,
  }])

  const [message, setMessage] = useState('')

  const editorRef = useRef(null);
  const [editor, setEditor] = useState(null);

  const [output, setOutput] = useState('');
  const [pyodide, setPyodide] = useState(null);

  // Load Pyodide dynamically
  useEffect(() => {
    const loadPyodide = async () => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js";
      script.onload = async () => {
        const pyodide = await window.loadPyodide(); // Load the Pyodide instance
        setPyodide(pyodide); // Save Pyodide instance to state
      };
      document.body.appendChild(script); // Append the script to the body
    };
    loadPyodide(); // Load Pyodide when the component mounts
  }, []);

  useEffect(() => {
    // Initialize Ace editor
    const aceEditor = ace.edit(editorRef.current);
    aceEditor.setTheme("ace/theme/monokai");
    aceEditor.session.setMode("ace/mode/python");
    aceEditor.setValue(''); 
    setEditor(aceEditor);

    return () => aceEditor.destroy();
    
  }, []);

    // Function to run Python code using Pyodide
    const runCode = async () => {
      const code = editor.getValue(); // Get Python code from the editor
  
      if (pyodide) {
        try {
          // Redirect standard output to capture print statements
          await pyodide.runPythonAsync(`
            import sys
            from io import StringIO
            
            # Redirect stdout to capture print statements
            class StreamToLogger(object):
                def __init__(self):
                    self.value = StringIO()
                def write(self, message):
                    self.value.write(message)
                def get_value(self):
                    return self.value.getvalue()
            
            sys.stdout = StreamToLogger()  # Redirect print to capture output
            ${code}  # Run the user's code
            output = sys.stdout.get_value()  # Get the captured output
            `)
  
          // Extract the captured output
          const output = await pyodide.runPythonAsync("output");
          setOutput(output || ""); // Display the result in the output area
  
        } catch (err) {
          setOutput(`Error: ${err.message}`); // Handle any errors
        }
      } else {
        setOutput("Pyodide not loaded yet! Please wait...");
      }
    };


  const sendMessage = async() => {
    setMessage('')
    setMessages((messages) => [
      ...messages, 
      {role: "user", content: message}, 
      {role: "assistant", content: ''},
    ])
    const response = fetch('/api/chat', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...messages, {role: "user", content: message}]), 
    }).then(async (res) => {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let result = ''
      return reader.read().then(function processText({done, value}){
        if (done){
          return result
        }
        const text = decoder.decode(value || new Int8Array(), {stream:true})
        setMessages((messages)=> {
          let lastMessage = messages[messages.length - 1]
          let otherMessages = messages.slice(0, messages.length - 1)
          return[
            ...otherMessages, 
            {
              ...lastMessage, 
              content: lastMessage.content + text, 
            }, 
          ]
        })
        return reader.read().then(processText)
      }) 
    })
  }

  return (
    <Box // Box with items (Top: Nav Bar Bottom: Contents Box)
    >
      <Box width="100%">
          <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" style={{ flexGrow: 1 }}>
              Code Clarity
            </Typography>
            <Button color="inherit">Interviews</Button>
            <Button color="inherit">Support</Button>
            <Button color="inherit">Login</Button>
          </Toolbar>
        </AppBar>
      </Box>

      <Box // Contents Box
      width="100vw"
      height="100vh"
      display='flex'
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      p={4}
      >
        
        <Box // Box with items (Left: Editor Chunk | Right: Chatbot)
        display="flex" 
        width="100%" 
        justifyContent="space-between" 
        alignItems="center"
        px={4}
        >
        <Box // Left Side Box
          width="50%"
          display="flex"
          flexDirection="column"
          justifyContent="flex-start"
          alignItems="stretch"
          mx={2}
        >
          <Box // Run Button
           mb={2} 
           >
            <Button variant="contained" onClick={runCode}>Run</Button>
          </Box>
          
          <Box // Code Editor Box
            width="100%"
            display="flex"
            justifyContent="center" 
            alignItems="center"
            mb={2}
          >
            <Box ref={editorRef} id="editor" 
              style={{ 
                width: "100%", 
                height: "500px", 
                borderRadius: "12px",
                overflow: "hidden", 
                border: "1px solid #ccc" 
              }} />
          </Box>
          
          <Box // Output Box
              width="100%"
              bgcolor="grey.200"
              p={2}
              borderRadius={4}
              height="100px"
              overflow="auto"
            >
              <Typography variant="body1" color="textPrimary">
                {output || "Output will appear here"}
              </Typography>
          </Box>

        </Box>
        
        <Box // Chatbot Box
          width="50%" 
          display="flex"
          justifyContent="center" 
          alignItems="center"
        >
          <Stack
            direction="column"
            width="600px"
            height="700px"
            border="1px solid black"
            p={2}
            spacing={3}
          >
            <Stack 
              direction="column"
              spacing={2}
              flexGrow={1}
              overflow="auto"
              maxHeight="100%"
              >
                {
                  messages.map((message,index) => (
                    <Box 
                      key={index}
                      display="flex"
                      justifyContent={
                        message.role === 'assistant' ? "flex-start" : "flex-end"
                      }
                    >
                      <Box
                        bgcolor={
                          message.role === 'assistant'
                          ? 'primary.main'
                          : 'secondary.main'
                        }
                        color="white"
                        borderRadius={16}
                        p={3}
                      >
                        <ReactMarkdown >
                          {message.content}
                        </ReactMarkdown>
                      </Box>
                    </Box>
                  ))
                }
              </Stack>
              <Stack direction="row" spacing={2} >
                <TextField
                  label = "message"
                  fullWidth
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button variant= "contained" onClick={sendMessage}> Send </Button>
                
              </Stack>
          </Stack>
        </Box>
        
      </Box>
    </Box>
    </Box>

  )
}
