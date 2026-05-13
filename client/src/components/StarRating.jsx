import { Star } from 'lucide-react';

const StarRating = ({ value, max = 5, interactive = false, onChange, size = 16 }) => {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(value);
        const Tag = interactive ? 'button' : 'span';
        return (
          <Tag
            key={i}
            type={interactive ? 'button' : undefined}
            onClick={() => interactive && onChange && onChange(i + 1)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star
              size={size}
              strokeWidth={1.5}
              className={filled ? 'text-espresso-400 fill-espresso-400' : 'text-cream-300 fill-cream-200'}
            />
          </Tag>
        );
      })}
    </div>
  );
};

export default StarRating;
