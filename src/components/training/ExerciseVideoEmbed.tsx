/**
 * @purpose Embed YouTube videos inline via iframe instead of redirecting to external tab.
 */

interface ExerciseVideoEmbedProps {
  videoId?: string;
  name: string;
}

const ExerciseVideoEmbed = ({ videoId, name }: ExerciseVideoEmbedProps) => {
  if (!videoId) return null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border aspect-video bg-black/90">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
        title={`Como executar: ${name}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
        loading="lazy"
      />
    </div>
  );
};

export default ExerciseVideoEmbed;
