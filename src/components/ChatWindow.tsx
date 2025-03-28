import { useState, useRef, useEffect } from "react";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { TextInput } from "./ui/text-input";
import { User, Bot } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: 'human' | 'assistant';
  timestamp: Date;
}

export const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm your AI reading companion. I can help you understand the text better and answer any questions you might have.",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);

  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (content: string) => {
    const newMessages: Message[] = [
      ...messages,
      {
        id: Date.now().toString(),
        content,
        sender: "human",
        timestamp: new Date(),
      },
      {
        id: (Date.now() + 1).toString(),
        content: "I'm simulating an assistant response to your message: " + content,
        sender: "assistant",
        timestamp: new Date(),
      },
    ];
    setMessages(newMessages);
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollViewportRef.current) {
      const scrollElement = scrollViewportRef.current;
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  return (
    <div className="flex-1 h-full flex flex-col">
      <div className="flex-1 flex flex-col min-h-0 relative">
        <ScrollArea 
          className="h-[calc(100vh-180px)]"
          scrollHideDelay={0}
        >
          <div className="space-y-4 px-4 pb-4" ref={scrollViewportRef}>
            {messages.map((message) => (
              <Card key={message.id} className="p-3 lg:p-4 card-gradient">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-1">
                    {message.sender === "human" ? (
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground">{message.content}</p>
                    <p className="text-xs text-muted-foreground/50">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t w-full">
          <TextInput
            placeholder="Ask a question..."
            onMessageSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
};
