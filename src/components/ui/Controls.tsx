import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const analysisSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10, 'Symbol too long'),
});

type AnalysisForm = z.infer<typeof analysisSchema>;

interface ControlsProps {
  onAnalyze: (data: AnalysisForm) => void;
  loading?: boolean;
  defaultValues?: Partial<AnalysisForm>;
}

export const Controls: React.FC<ControlsProps> = ({
  onAnalyze,
  loading = false,
  defaultValues = {
    symbol: 'SPY'
  }
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<AnalysisForm>({
    resolver: zodResolver(analysisSchema),
    defaultValues
  });

  const watchedValues = watch();

  const onSubmit = (data: AnalysisForm) => {
    onAnalyze(data);
  };

  return (
    <div className="professional-metric p-6 rounded-lg h-96">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-green-400 mb-2">
          ANALYSIS PARAMETERS
        </h3>
        <div className="h-px bg-gradient-to-r from-green-400 to-transparent"></div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Symbol Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            SYMBOL
          </label>
          <input
            {...register('symbol')}
            type="text"
            placeholder="SPY"
            className={cn(
              'w-full px-3 py-2 bg-black border rounded font-mono text-green-400',
              'focus:outline-none focus:ring-2 focus:ring-green-400/50',
              errors.symbol ? 'border-red-500' : 'border-gray-600'
            )}
          />
          {errors.symbol && (
            <p className="text-red-400 text-xs mt-1">{errors.symbol.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mt-6">
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'px-8 py-3 bg-green-600 text-black font-semibold rounded-lg',
              'hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200',
              loading && 'animate-pulse'
            )}
          >
            {loading ? 'ANALYZING...' : 'RUN ANALYSIS'}
          </button>
        </div>
      </form>

      {/* Real-time Preview */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 font-mono">
          <div className="space-y-2">
            <div>
              <span className="text-gray-500">Projection Period:</span>
              <span className="text-green-400 ml-2">
                90 days (3 months)
              </span>
            </div>
            <div>
              <span className="text-gray-500">Target Date:</span>
              <span className="text-green-400 ml-2">
                {new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                  .toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Historical Data:</span>
              <span className="text-green-400 ml-2">
                Maximum Available
              </span>
            </div>
            <div>
              <span className="text-gray-500">Models:</span>
              <span className="text-green-400 ml-2">
                Prophet, Markov Chain, Neural Networks
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};