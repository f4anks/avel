// --- 0. FUNCIÓN DE ACCESO CON CONTRASEÑA (NUEVA FUNCIÓN) ---
window.accessDataAtletas = (event) => {
    // Evita la navegación predeterminada del enlace o botón
    event.preventDefault(); 

    // Las credenciales requeridas
    const requiredUser = "admin";
    const requiredPass = "Volei2025";
    
    // 1. Solicitar Usuario
    const user = prompt("Ingrese su Usuario:");

    if (user === null || user.trim() !== requiredUser) {
        alert("Usuario incorrecto o cancelado.");
        return; 
    }

    // 2. Solicitar Contraseña
    const password = prompt("Ingrese la Contraseña:");

    // 3. Validar
    if (password === requiredPass) {
        // Contraseña Válida: Redirigir al archivo en la carpeta especificada
        window.location.href = 'dataatletas/atletas_edit.html';
    } else if (password !== null) {
        // Contraseña Inválida (no cancelada)
        alert("La contraseña es incorrecta");
    }
};


// --- 1. CONFIGURACIÓN DE FIREBASE ---
// Reemplaza los placeholders con tu configuración real de Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_STORAGE_BUCKET",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const athletesCollection = db.collection('athletes');

// --- 2. MANEJO DE FORMULARIO Y EDICIÓN ---
const form = document.getElementById('athleteForm');
const tableBody = document.getElementById('athletesTableBody');
const submitButton = document.getElementById('submitButton');
const cancelButton = document.getElementById('cancelButton');
const formTitle = document.getElementById('form-title');
let currentSortColumn = 'ci';
let sortDirection = 'asc';

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const athleteId = document.getElementById('athleteId').value;
    const data = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        ci: document.getElementById('ci').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        position: document.getElementById('position').value,
        gender: document.getElementById('gender').value,
        club: document.getElementById('club').value.trim(),
        category: document.getElementById('category').value.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Calcular la edad (útil para el filtro o tabla)
    const ageInYears = calculateAge(data.birthDate);
    data.age = ageInYears;
    data.fullName = `${data.firstName} ${data.lastName}`; // Campo combinado para ordenamiento

    try {
        if (athleteId) {
            // Modo Edición
            await athletesCollection.doc(athleteId).update(data);
            alert('Atleta actualizado con éxito.');
        } else {
            // Modo Registro
            // Verificar si la CI ya existe (opcional, Firebase no tiene restricción de unicidad nativa sin reglas)
            await athletesCollection.add(data);
            alert('Atleta registrado con éxito.');
        }
        resetForm();
    } catch (error) {
        console.error("Error al guardar o actualizar: ", error);
        alert('Hubo un error al procesar la solicitud.');
    }
});

cancelButton.addEventListener('click', resetForm);

function resetForm() {
    form.reset();
    document.getElementById('athleteId').value = '';
    formTitle.textContent = 'Registrar Nuevo Atleta';
    submitButton.textContent = 'Registrar Atleta';
    cancelButton.style.display = 'none';
    document.getElementById('ci').disabled = false;
    form.classList.remove('is-editing');
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

// Función para cargar datos al formulario para edición
window.editAthlete = (id) => {
    athletesCollection.doc(id).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('athleteId').value = id;
            document.getElementById('firstName').value = data.firstName;
            document.getElementById('lastName').value = data.lastName;
            document.getElementById('ci').value = data.ci;
            document.getElementById('birthDate').value = data.birthDate;
            document.getElementById('position').value = data.position;
            document.getElementById('gender').value = data.gender;
            document.getElementById('club').value = data.club;
            document.getElementById('category').value = data.category;
            
            // Cambiar la interfaz a modo edición
            formTitle.textContent = `Editar Atleta: ${data.fullName}`;
            submitButton.textContent = 'Guardar Cambios';
            cancelButton.style.display = 'block';
            document.getElementById('ci').disabled = true; // Bloquear CI en edición
            form.classList.add('is-editing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert('El atleta no existe.');
        }
    }).catch(error => {
        console.error("Error al obtener el documento para edición: ", error);
    });
};

// Función para eliminar
window.deleteAthlete = (id, fullName) => {
    if (confirm(`¿Está seguro de eliminar a ${fullName} del registro? Esta acción es irreversible.`)) {
        athletesCollection.doc(id).delete().then(() => {
            alert("Atleta eliminado con éxito.");
        }).catch(error => {
            console.error("Error al eliminar el documento: ", error);
            alert("Error al eliminar el atleta.");
        });
    }
};

// --- 3. GESTIÓN DE LA TABLA EN TIEMPO REAL Y ORDENAMIENTO ---

// Listener de Firestore en tiempo real
athletesCollection.orderBy(currentSortColumn, sortDirection).onSnapshot(snapshot => {
    // Cuando los datos cambian, redibujamos toda la tabla
    const athletes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTable(athletes);
}, error => {
    console.error("Error al escuchar los cambios en Firestore: ", error);
    // Mostrar un mensaje de error en la tabla si es necesario
});

// Función para ordenar y renderizar la tabla
function renderTable(athletes) {
    // Ordenar los datos antes de renderizar (si se necesita un ordenamiento secundario en el cliente)
    const sortedAthletes = athletes.sort((a, b) => {
        const aVal = a[currentSortColumn];
        const bVal = b[currentSortColumn];

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    tableBody.innerHTML = '';
    
    if (sortedAthletes.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center">No hay atletas registrados aún.</td></tr>`;
        return;
    }

    sortedAthletes.forEach(athlete => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${athlete.ci || 'N/A'}</td>
            <td>${athlete.fullName || 'N/A'}</td>
            <td>${athlete.age || 'N/A'}</td>
            <td>${athlete.position || 'N/A'}</td>
            <td>${athlete.gender || 'N/A'}</td>
            <td>${athlete.club || 'N/A'}</td>
            <td>
                <button onclick="editAthlete('${athlete.id}')" class="btn btn-sm btn-info btn-table">Editar</button>
                <button onclick="deleteAthlete('${athlete.id}', '${athlete.fullName}')" class="btn btn-sm btn-danger btn-table">Eliminar</button>
            </td>
        `;
    });
    
    updateHeaderIndicators();
}

// Manejador de eventos para encabezados de columna
document.querySelectorAll('#athletesTable thead th[data-sort]').forEach(header => {
    header.addEventListener('click', () => {
        const column = header.getAttribute('data-sort');
        
        if (currentSortColumn === column) {
            // Si es la misma columna, invertimos la dirección
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Si es una columna nueva, reseteamos a ascendente
            currentSortColumn = column;
            sortDirection = 'asc';
        }
        
        // Re-ejecutar la consulta o re-ordenar la lista que ya tenemos en memoria
        // En este caso, haremos una re-consulta a Firestore para un ordenamiento oficial
        athletesCollection.orderBy(currentSortColumn, sortDirection).onSnapshot(snapshot => {
            const athletes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTable(athletes); // Esta función incluye el ordenamiento final
        });
    });
});

// Actualiza los iconos de dirección de ordenamiento en los encabezados
function updateHeaderIndicators() {
    document.querySelectorAll('#athletesTable thead th').forEach(header => {
        header.innerHTML = header.textContent.replace(' ▲', '').replace(' ▼', ''); // Limpiar iconos

        if (header.getAttribute('data-sort') === currentSortColumn) {
            const icon = sortDirection === 'asc' ? ' ▲' : ' ▼';
            header.innerHTML += icon;
        }
    });
}

// Inicializar la tabla al cargar la página (la llamada onSnapshot lo hace)
