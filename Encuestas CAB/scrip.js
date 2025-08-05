function toggleForm(id) {
  // Ocultar todos los formularios primero
  const formularios = document.querySelectorAll("form");
  formularios.forEach(form => {
    if (form.id !== id) {
      form.classList.add("hidden");
    }
  });

  // Mostrar u ocultar el formulario seleccionado
  const selectedForm = document.getElementById(id);
  selectedForm.classList.toggle("hidden");
}
