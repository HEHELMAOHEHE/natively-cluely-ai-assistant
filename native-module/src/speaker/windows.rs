<<<<<<< HEAD
// Windows WASAPI speaker/system audio capture using loopback mode
// Based on the pluely Windows implementation using wasapi 0.19.0
use anyhow::Result;
use ringbuf::{
    traits::{Producer, Split},
    HeapCons, HeapProd, HeapRb,
};
=======
// Ported logic
use anyhow::Result;
>>>>>>> main
use std::collections::VecDeque;
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Duration;
<<<<<<< HEAD
use wasapi::{get_default_device, DeviceCollection, Direction, SampleType, StreamMode, WaveFormat};

/// Shared state for signaling shutdown
struct CaptureState {
=======
use tracing::error;
use wasapi::{get_default_device, DeviceCollection, Direction, SampleType, StreamMode, WaveFormat};

struct WakerState {
    // waker: Option<Waker>, // Not used in NAPI context directly same way
>>>>>>> main
    shutdown: bool,
}

pub struct SpeakerInput {
    device_id: Option<String>,
}

pub struct SpeakerStream {
<<<<<<< HEAD
    consumer: Option<HeapCons<f32>>,
    capture_state: Arc<Mutex<CaptureState>>,
=======
    sample_queue: Arc<Mutex<VecDeque<f32>>>,
    waker_state: Arc<Mutex<WakerState>>,
>>>>>>> main
    capture_thread: Option<thread::JoinHandle<()>>,
    actual_sample_rate: u32,
}

impl SpeakerStream {
    pub fn sample_rate(&self) -> u32 {
        self.actual_sample_rate
    }
<<<<<<< HEAD

    /// Take the consumer for lock-free audio sample reading.
    /// This can only be called once - subsequent calls return None.
    pub fn take_consumer(&mut self) -> Option<HeapCons<f32>> {
        self.consumer.take()
    }
}

/// Helper to find device by ID
=======
    
    // Read available samples
    pub fn read_chunk(&mut self, max_samples: usize) -> Vec<f32> {
        let mut queue = self.sample_queue.lock().unwrap();
        let count = std::cmp::min(queue.len(), max_samples);
        let mut samples = Vec::with_capacity(count);
        for _ in 0..count {
            if let Some(s) = queue.pop_front() {
                samples.push(s);
            }
        }
        samples
    }
}

// Helper to find device by ID
>>>>>>> main
fn find_device_by_id(direction: &Direction, device_id: &str) -> Option<wasapi::Device> {
    let collection = DeviceCollection::new(direction).ok()?;
    let count = collection.get_nbr_devices().ok()?;

    for i in 0..count {
        if let Ok(device) = collection.get_device_at_index(i) {
            if let Ok(id) = device.get_id() {
                if id == device_id {
                    return Some(device);
                }
            }
        }
    }
    None
}

pub fn list_output_devices() -> Result<Vec<(String, String)>> {
    let collection = DeviceCollection::new(&Direction::Render)?;
    let count = collection.get_nbr_devices()?;
    let mut list = Vec::new();

    for i in 0..count {
        if let Ok(device) = collection.get_device_at_index(i) {
            let id = device.get_id().unwrap_or_default();
            let name = device.get_friendlyname().unwrap_or_default();
            if !id.is_empty() {
                list.push((id, name));
            }
        }
    }
    Ok(list)
}

impl SpeakerInput {
    pub fn new(device_id: Option<String>) -> Result<Self> {
        let device_id = device_id.filter(|id| !id.is_empty() && id != "default");
        Ok(Self { device_id })
    }

    pub fn stream(self) -> SpeakerStream {
<<<<<<< HEAD
        // Create ring buffer for lock-free audio transfer (128KB = 131072 samples)
        let buffer_size = 131072;
        let rb = HeapRb::<f32>::new(buffer_size);
        let (producer, consumer) = rb.split();

        let capture_state = Arc::new(Mutex::new(CaptureState { shutdown: false }));
        let (init_tx, init_rx) = mpsc::channel();

        let state_clone = capture_state.clone();
        let device_id = self.device_id;

        let capture_thread = thread::spawn(move || {
            if let Err(e) = Self::capture_audio_loop(producer, state_clone, init_tx, device_id) {
                eprintln!("[Windows Audio] Capture loop failed: {}", e);
=======
        let sample_queue = Arc::new(Mutex::new(VecDeque::new()));
        let waker_state = Arc::new(Mutex::new(WakerState {
            shutdown: false,
        }));
        let (init_tx, init_rx) = mpsc::channel();

        let queue_clone = sample_queue.clone();
        let waker_clone = waker_state.clone();
        let device_id = self.device_id;

        let capture_thread = thread::spawn(move || {
            if let Err(e) = Self::capture_audio_loop(queue_clone, waker_clone, init_tx, device_id) {
                error!("Audio capture loop failed: {}", e);
>>>>>>> main
            }
        });

        let actual_sample_rate = match init_rx.recv_timeout(Duration::from_secs(5)) {
<<<<<<< HEAD
            Ok(Ok(rate)) => {
                println!("[Windows Audio] Initialized at {} Hz", rate);
                rate
            }
            Ok(Err(e)) => {
                eprintln!("[Windows Audio] Initialization failed: {}", e);
                44100
            }
            Err(_) => {
                eprintln!("[Windows Audio] Initialization timeout");
=======
            Ok(Ok(rate)) => rate,
            Ok(Err(e)) => {
                error!("Audio initialization failed: {}", e);
                44100
            }
            Err(_) => {
                error!("Audio initialization timeout");
>>>>>>> main
                44100
            }
        };

        SpeakerStream {
<<<<<<< HEAD
            consumer: Some(consumer),
            capture_state,
=======
            sample_queue,
            waker_state,
>>>>>>> main
            capture_thread: Some(capture_thread),
            actual_sample_rate,
        }
    }

    fn capture_audio_loop(
<<<<<<< HEAD
        mut producer: HeapProd<f32>,
        capture_state: Arc<Mutex<CaptureState>>,
=======
        sample_queue: Arc<Mutex<VecDeque<f32>>>,
        waker_state: Arc<Mutex<WakerState>>,
>>>>>>> main
        init_tx: mpsc::Sender<Result<u32>>,
        device_id: Option<String>,
    ) -> Result<()> {
        let init_result = (|| -> Result<_> {
<<<<<<< HEAD
            // Get the render device (for loopback capture of system audio)
            let device = match device_id {
                Some(ref id) => match find_device_by_id(&Direction::Render, id) {
                    Some(d) => {
                        println!(
                            "[Windows Audio] Using device: {}",
                            d.get_friendlyname().unwrap_or_else(|_| "Unknown".to_string())
                        );
                        d
                    }
                    None => {
                        println!("[Windows Audio] Device not found, using default");
                        get_default_device(&Direction::Render)?
                    }
=======
            let device = match device_id {
                Some(ref id) => match find_device_by_id(&Direction::Render, id) {
                    Some(d) => d,
                    None => get_default_device(&Direction::Render).expect("No default render device"),
>>>>>>> main
                },
                None => get_default_device(&Direction::Render)?,
            };

<<<<<<< HEAD
            let device_name = device
                .get_friendlyname()
                .unwrap_or_else(|_| "Unknown".to_string());
            println!("[Windows Audio] Capturing from: {}", device_name);

            let mut audio_client = device.get_iaudioclient()?;
            let device_format = audio_client.get_mixformat()?;
            let actual_rate = device_format.get_samplespersec();

            // Request mono f32 format for easier processing
            let desired_format = WaveFormat::new(
                32,                   // bits per sample
                32,                   // valid bits
                &SampleType::Float,
                actual_rate as usize,
                1,                    // mono
                None,
            );

            let (_def_time, min_time) = audio_client.get_device_period()?;

            // Use shared loopback mode with auto-conversion
=======
            let mut audio_client = device.get_iaudioclient()?;
            let device_format = audio_client.get_mixformat()?;
            let actual_rate = device_format.get_samplespersec();
            let desired_format = WaveFormat::new(32, 32, &SampleType::Float, actual_rate as usize, 1, None);

            let (_def_time, min_time) = audio_client.get_device_period()?;
>>>>>>> main
            let mode = StreamMode::EventsShared {
                autoconvert: true,
                buffer_duration_hns: min_time,
            };

<<<<<<< HEAD
            // Initialize for loopback capture (capture from render device)
            audio_client.initialize_client(&desired_format, &Direction::Capture, &mode)?;

            let h_event = audio_client.set_get_eventhandle()?;
            let capture_client = audio_client.get_audiocaptureclient()?;
            audio_client.start_stream()?;

            Ok((h_event, capture_client, actual_rate))
        })();

        match init_result {
            Ok((h_event, capture_client, sample_rate)) => {
                let _ = init_tx.send(Ok(sample_rate));

                let mut consecutive_drops = 0u32;
                let max_buffer_size = 131072usize;

                loop {
                    // Check shutdown signal
                    {
                        let state = capture_state.lock().unwrap();
                        if state.shutdown {
                            println!("[Windows Audio] Shutdown signal received");
=======
            audio_client.initialize_client(&desired_format, &Direction::Capture, &mode)?;
            let h_event = audio_client.set_get_eventhandle()?;
            let render_client = audio_client.get_audiocaptureclient()?;
            audio_client.start_stream()?;

            Ok((h_event, render_client, actual_rate))
        })();

        match init_result {
            Ok((h_event, render_client, sample_rate)) => {
                let _ = init_tx.send(Ok(sample_rate));
                loop {
                    {
                        let state = waker_state.lock().unwrap();
                        if state.shutdown {
>>>>>>> main
                            break;
                        }
                    }

<<<<<<< HEAD
                    // Wait for audio data event
                    if h_event.wait_for_event(3000).is_err() {
                        eprintln!("[Windows Audio] Event timeout, stopping capture");
                        break;
                    }

                    // Read available audio data into deque
                    let mut temp_queue: VecDeque<u8> = VecDeque::new();
                    if let Err(e) = capture_client.read_from_device_to_deque(&mut temp_queue) {
                        eprintln!("[Windows Audio] Failed to read audio: {}", e);
=======
                    if h_event.wait_for_event(3000).is_err() {
                        error!("Timeout error, stopping capture");
                        break;
                    }

                    let mut temp_queue = VecDeque::new();
                    if let Err(e) = render_client.read_from_device_to_deque(&mut temp_queue) {
                        error!("Failed to read audio data: {}", e);
>>>>>>> main
                        continue;
                    }

                    if temp_queue.is_empty() {
                        continue;
                    }

<<<<<<< HEAD
                    // Convert bytes to f32 samples (4 bytes per sample)
=======
>>>>>>> main
                    let mut samples = Vec::new();
                    while temp_queue.len() >= 4 {
                        let bytes = [
                            temp_queue.pop_front().unwrap(),
                            temp_queue.pop_front().unwrap(),
                            temp_queue.pop_front().unwrap(),
                            temp_queue.pop_front().unwrap(),
                        ];
                        let sample = f32::from_le_bytes(bytes);
                        samples.push(sample);
                    }

                    if !samples.is_empty() {
<<<<<<< HEAD
                        // Push to ring buffer (lock-free)
                        let pushed = producer.push_slice(&samples);

                        if pushed < samples.len() {
                            consecutive_drops += 1;
                            if consecutive_drops == 25 {
                                eprintln!(
                                    "[Windows Audio] Warning: Buffer overflow - system may be overloaded"
                                );
                            }
                            if consecutive_drops > 50 {
                                eprintln!("[Windows Audio] Critical: Stopping due to persistent overflow");
                                break;
                            }
                        } else {
                            consecutive_drops = 0;
                        }
=======
                         let mut queue = sample_queue.lock().unwrap();
                         let max_buffer_size = 131072; // 128KB
                         queue.extend(samples.iter());
                         if queue.len() > max_buffer_size {
                             let to_drop = queue.len() - max_buffer_size;
                             queue.drain(0..to_drop);
                         }
>>>>>>> main
                    }
                }
            }
            Err(e) => {
                let _ = init_tx.send(Err(e));
            }
        }
<<<<<<< HEAD

        println!("[Windows Audio] Capture loop ended");
=======
>>>>>>> main
        Ok(())
    }
}

<<<<<<< HEAD
impl Drop for SpeakerStream {
    fn drop(&mut self) {
        // Signal shutdown
        if let Ok(mut state) = self.capture_state.lock() {
            state.shutdown = true;
        }

        // Wait for capture thread to finish
        if let Some(handle) = self.capture_thread.take() {
            let _ = handle.join();
=======
// Implement Drop to stop the thread
impl Drop for SpeakerStream {
    fn drop(&mut self) {
        if let Ok(mut state) = self.waker_state.lock() {
            state.shutdown = true;
        }
        if let Some(handle) = self.capture_thread.take() {
             let _ = handle.join();
>>>>>>> main
        }
    }
}
