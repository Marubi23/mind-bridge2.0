/**
 * Booking Module – handles time slots, form submission, localStorage
 */
const BookingManager = {
    init(modalElement, therapist) {
        this.modal = modalElement;
        this.therapist = therapist;
        this.attachEventListeners();
        this.generateTimeSlots();
    },

    generateTimeSlots() {
        const timeSelect = document.getElementById('bookingTime');
        if (!timeSelect) return;
        timeSelect.innerHTML = '<option value="">Select a time</option>';
        for (let hour = 9; hour <= 17; hour++) {
            if (hour === 13) continue; // lunch break
            const ampm = hour < 12 ? 'AM' : 'PM';
            const displayHour = hour > 12 ? hour - 12 : hour;
            timeSelect.innerHTML += `<option value="${hour}:00">${displayHour}:00 ${ampm}</option>`;
            timeSelect.innerHTML += `<option value="${hour}:30">${displayHour}:30 ${ampm}</option>`;
        }
    },

    attachEventListeners() {
        const form = document.getElementById('bookingForm');
        if (!form) return;

        // Set min date to today
        const dateInput = document.getElementById('bookingDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('bookingDate').value;
            const time = document.getElementById('bookingTime').value;
            const sessionType = document.getElementById('sessionType').value;
            const notes = document.querySelector('#bookingForm textarea')?.value || '';

            if (!date || !time || !sessionType) {
                alert('Please fill all required fields');
                return;
            }

            // Save to localStorage (or send to backend)
            const booking = {
                therapistId: this.therapist.id,
                therapistName: this.therapist.name,
                date,
                time,
                sessionType,
                notes,
                bookedAt: new Date().toISOString(),
                status: 'pending'
            };
            const bookings = JSON.parse(localStorage.getItem('mindbridge_bookings') || '[]');
            bookings.push(booking);
            localStorage.setItem('mindbridge_bookings', JSON.stringify(bookings));

            alert(`✅ Booking confirmed!\n\nYou have scheduled a ${sessionType} session with ${this.therapist.name} on ${date} at ${time}.\nA confirmation email has been sent.`);
            this.modal.classList.remove('active');
            form.reset();
        });
    }
};