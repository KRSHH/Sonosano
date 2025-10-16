import os
import librosa
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from scipy import signal
from tinytag import TinyTag
import logging

def analyze_audio_for_visualization(file_path):
    """
    Analyzes an audio file and returns data for plotting.
    """
    if not os.path.exists(file_path):
        return None, f"File not found at '{file_path}'"

    analysis_data = {"filename": os.path.basename(file_path)}
    plot_data = {}

    try:
        y, sr = librosa.load(file_path, sr=None, mono=False)
        
        is_stereo = y.ndim >= 2 and y.shape[0] >= 2
        y_mono = y[0] if is_stereo else y
        
        D_stft = librosa.stft(y_mono)
        S_dB_stft = librosa.amplitude_to_db(np.abs(D_stft), ref=np.max)
        freqs_stft = librosa.fft_frequencies(sr=sr)
        
        max_freq_energy = np.max(S_dB_stft, axis=1)

        threshold_db = np.max(max_freq_energy) - 60
        significant_bins = np.where(max_freq_energy > threshold_db)[0]
        highest_freq_bin = significant_bins[-1] if len(significant_bins) > 0 else 0
        cutoff_freq = freqs_stft[highest_freq_bin]
        analysis_data["cutoff_freq_khz"] = round(cutoff_freq / 1000, 2)
        
        plot_data = {"y": y, "sr": sr, "S_dB": S_dB_stft, "freqs": freqs_stft, "max_energy": max_freq_energy}

        if is_stereo and sr >= 44100 and cutoff_freq > 16000:
            b, a = signal.butter(4, 16000 / (sr / 2), btype='high')
            left_hf = signal.filtfilt(b, a, y[0])
            right_hf = signal.filtfilt(b, a, y[1])
            correlation_matrix = np.corrcoef(left_hf, right_hf)
            analysis_data["stereo_correlation"] = round(correlation_matrix[0, 1], 3)
            plot_data.update({"left_hf": left_hf, "right_hf": right_hf})
        
        return analysis_data, plot_data

    except Exception as e:
        logging.error(f"Error during forensic analysis for visualization: {e}", exc_info=True)
        return None, f"Analysis failed: {e}"

def create_visual_report(analysis_data, plot_data, output_path):
    """
    Generates and saves a multi-panel figure with detailed graphs in a dark, high-tech theme.
    """
    if not plot_data:
        logging.warning("No plot data available to generate visual report.")
        return


    BACKGROUND_COLOR = '#1C1C1E'
    TEXT_COLOR = '#EAEAEB'
    PRIMARY_ACCENT = '#00AEEF' 
    SECONDARY_ACCENT = '#DAA520'  
    GRID_COLOR = '#444444'
    
    plt.style.use('dark_background')
    plt.rcParams.update({
        'figure.facecolor': BACKGROUND_COLOR,
        'axes.facecolor': BACKGROUND_COLOR,
        'axes.edgecolor': GRID_COLOR,
        'axes.labelcolor': TEXT_COLOR,
        'axes.titlecolor': TEXT_COLOR,
        'xtick.color': TEXT_COLOR,
        'ytick.color': TEXT_COLOR,
        'grid.color': GRID_COLOR,
        'legend.facecolor': '#2A2A2C',
        'legend.edgecolor': GRID_COLOR,
        'legend.labelcolor': TEXT_COLOR,
        'text.color': TEXT_COLOR,
    })

    fig, axs = plt.subplots(2, 2, figsize=(20, 12))
    fig.suptitle(f"Audio Forensic Analysis: {analysis_data.get('filename', 'N/A')}", fontsize=22, weight='bold', color=TEXT_COLOR)

    # --- 1. Linear Spectrogram ---
    ax = axs[0, 0]
    img = librosa.display.specshow(plot_data['S_dB'], sr=plot_data['sr'], x_axis='time', y_axis='linear', ax=ax, cmap='magma')
    cbar = fig.colorbar(img, ax=ax, format='%+2.0f dB')
    cbar.ax.yaxis.set_tick_params(color=TEXT_COLOR)
    ax.axhline(y=analysis_data['cutoff_freq_khz'] * 1000, color=PRIMARY_ACCENT, linestyle='--', label=f"Detected Cutoff: {analysis_data['cutoff_freq_khz']} kHz")
    ax.set_title('Linear Spectrogram', fontsize=16, weight='bold')
    ax.legend()

    # --- 2. Spectral Power Distribution ---
    ax = axs[0, 1]
    ax.plot(plot_data['freqs'], plot_data['max_energy'], color=PRIMARY_ACCENT)
    ax.axvline(x=analysis_data['cutoff_freq_khz'] * 1000, color=SECONDARY_ACCENT, linestyle='--', label=f"Detected Cutoff: {analysis_data['cutoff_freq_khz']} kHz")
    ax.set_title('Peak Spectral Power Distribution', fontsize=16, weight='bold')
    ax.set_xlabel('Frequency (Hz)')
    ax.set_ylabel('Power (dB)')
    ax.grid(True, alpha=0.3)
    ax.legend()

    # --- 3. High-Frequency Stereo Waveforms ---
    ax = axs[1, 0]
    if "left_hf" in plot_data:
        sample_slice = slice(int(plot_data['sr'] * 1.0), int(plot_data['sr'] * 1.5))
        time = np.linspace(0, 0.5, len(plot_data['left_hf'][sample_slice]))
        ax.plot(time, plot_data['left_hf'][sample_slice], color=PRIMARY_ACCENT, alpha=0.8, label='Left Channel HF')
        ax.plot(time, plot_data['right_hf'][sample_slice], color=SECONDARY_ACCENT, alpha=0.8, label='Right Channel HF')
        corr_val = analysis_data.get('stereo_correlation', 'N/A')
        ax.set_title(f'High-Frequency (>16kHz) Waveforms\nCorrelation: {corr_val}', fontsize=16, weight='bold')
        ax.set_xlabel('Time (slice)')
        ax.set_ylabel('Amplitude')
        ax.legend()
        ax.grid(True, alpha=0.3)
    else:
        ax.text(0.5, 0.5, 'Stereo analysis not applicable.', ha='center', va='center', fontsize=14, color=TEXT_COLOR)
        ax.set_title('High-Frequency Waveforms', fontsize=16, weight='bold')
        ax.axis('off')

    # --- 4. High-Frequency Phase Coherence Scatter Plot ---
    ax = axs[1, 1]
    if "left_hf" in plot_data:
        phase_slice = slice(int(plot_data['sr'] * 1.0), int(plot_data['sr'] * 1.2))
        left_phase = np.angle(signal.hilbert(plot_data['left_hf'][phase_slice]))
        right_phase = np.angle(signal.hilbert(plot_data['right_hf'][phase_slice]))
        
        ax.scatter(left_phase, right_phase, alpha=0.2, s=5, color=PRIMARY_ACCENT)
        ax.set_title('High-Frequency Phase Coherence', fontsize=16, weight='bold')
        ax.set_xlabel('Left Channel Phase (radians)')
        ax.set_ylabel('Right Channel Phase (radians)')
        ax.set_xlim([-np.pi, np.pi])
        ax.set_ylim([-np.pi, np.pi])
        ax.grid(True, alpha=0.3)
    else:
        ax.text(0.5, 0.5, 'Stereo analysis not applicable.', ha='center', va='center', fontsize=14, color=TEXT_COLOR)
        ax.set_title('High-Frequency Phase Coherence', fontsize=16, weight='bold')
        ax.axis('off')

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    plt.savefig(output_path, facecolor=BACKGROUND_COLOR)
    plt.close(fig)
    logging.info(f"Visual report saved as '{output_path}'.")