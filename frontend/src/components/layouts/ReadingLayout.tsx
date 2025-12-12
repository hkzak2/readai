interface ReadingLayoutProps {
  children: React.ReactNode;
}

export const ReadingLayout = ({ children }: ReadingLayoutProps) => {
  return (
    <div className="h-screen w-full overflow-hidden">
      {children}
    </div>
  );
};
