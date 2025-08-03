/**
 * Formate une date au format dd-mm-yyyy
 * @param dateString Chaîne de date ISO
 * @returns Date formatée
 */
const formatDateWithTimezone = (dateString: string): string => {
  if (!dateString) return '';
  
  // Ajouter l'heure (midi) pour éviter les problèmes de fuseau horaire
  const dateParts = dateString.split('T')[0].split('-');
  const correctedDate = new Date(
    parseInt(dateParts[0]), 
    parseInt(dateParts[1]) - 1, // Les mois sont indexés à partir de 0
    parseInt(dateParts[2]), 
    12, 0, 0 // Midi pour éviter les problèmes de fuseau horaire
  );
  
  // Formater la date pour l'affichage
  const day = correctedDate.getDate().toString().padStart(2, '0');
  const month = (correctedDate.getMonth() + 1).toString().padStart(2, '0');
  const year = correctedDate.getFullYear();
  
  return `${day}-${month}-${year}`;
};

export default formatDateWithTimezone; 